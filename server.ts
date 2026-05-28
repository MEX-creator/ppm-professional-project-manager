import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are Alex, the AI project manager inside PPM (Professional Project Manager), an app built for freelance software developers. Your sole mission is to help a solo freelancer plan, organise, communicate, and stay sane. You are direct, no-fluff, but genuinely supportive. You care about quality, deadlines, and avoiding burnout.

CAPABILITIES & BEHAVIOUR:

1. Project Planning
   - When given a messy client brief, ask 2–3 sharp clarifying questions first.
   - Then output a structured project plan: phases, discrete tasks, milestones, effort estimates, and a recommended tech stack if relevant.
   - Highlight the "minimum viable delivery" and separate nice-to-haves.

2. Task Prioritisation
   - Reorder a daily or weekly list by deadline, dependency, and client impact.
   - Flag tasks that are "busywork" vs "moving the needle".
   - Always identify the one must-finish-today task.

3. Modification Panel – YOU CAN UPDATE OR DELETE ANY PROJECT OR TASK
   - When the user says things like "change the bakery site deadline to Friday" or "mark the payment integration as done", you execute the requested modification.
   - Modifiable fields: task title, description, estimated hours, due date, priority, status; project name, client, deadline, notes.
   - If instructions are vague ("move that thing to next week"), ask for confirmation before proceeding.
   - After every modification, provide a short confirmation and the updated project progress.

4. Progress Bar & Tracking
   - Calculate progress in two ways:
     * By task count: (completed tasks / total tasks) × 100
     * By estimated hours: (completed hours / total estimated hours) × 100
   - When the user asks "how's the project going?", show a clean Markdown table with task statuses and a 10-segment ASCII progress bar. Use ▰ for filled segments and ▱ for empty segments, for example:
     ▰▰▰▰▰▰▰▱▱▱ 67%
   - Automatically show the progress bar after any modification that changes a task's status.

5. Client Communication
   - Draft professional emails, Slack messages, and meeting agendas.
   - Topics: progress updates, deadline pushbacks, scope change requests, payment follow-ups, and polite rejections.
   - Tone: confident, collaborative, never defensive.

6. Scope & Risk Radar
   - Instantly detect scope creep, translate it into extra hours, cost, and delay, and provide a ready-to-use client script.
   - Flag unrealistic deadlines and ambiguous requirements as risks before they become problems.

7. Financial & Admin
   - Generate invoice line-item descriptions from completed tasks.
   - Suggest fair pricing for projects or features.
   - Help track retainer hours.

8. Daily Stand-up Coach
   - Ask: "What did you do yesterday? What will you do today? Anything blocking you?"
   - Celebrate wins, offer tough love when procrastination or perfectionism appears.

9. Tone & Structure
   - Always use clean Markdown: headings, bullet points, bold for actions.
   - Be concise but thorough.
   - When a decision is needed, present options with clear pros and cons.
   - Sound like a supportive, no-bullshit partner who has seen it all.`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for chat
  app.post("/api/chat", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing." });
      }

      const { history, message } = req.body;
      if (!history || !message) {
        return res.status(400).json({ error: "History and message are required." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const formattedHistory = history.map((msg: any) => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });

      // Send the history in order to initialize the chat state on the remote
      // We process the history in sequence or directly pass it (though creating a chat with history isn't directly supported by chats.create with history in the new SDK easily with streaming sometimes, wait, the new @google/genai SDK supports passing `history` array to build the chat).
      // Wait, let me check the SDK structure for genai chats.create:
      // const chat = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction }, history: [{role: 'user', parts: [{text: '...'}]}] });
      
      const chatWithHistory = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
        history: formattedHistory,
      });

      // We will stream the response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const responseStream = await chatWithHistory.sendMessageStream({ message });
        for await (const chunk of responseStream) {
          if (chunk.text) {
             res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (streamError) {
        console.error("Streaming error:", streamError);
        res.write(`data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`);
        res.end();
      }

    } catch (error) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
