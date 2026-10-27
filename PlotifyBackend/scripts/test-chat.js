// tes chatbot dari terminal tanpa login
// jalankan: node --env-file=.env scripts/test-chat.js <user_id> "pertanyaan"
import { runChat } from "../src/utils/chatAgent.js";

const [userId, question] = process.argv.slice(2);

if (!userId || !question) {
  console.log('pakai: node --env-file=.env scripts/test-chat.js <user_id> "pertanyaan"');
  process.exit(1);
}

const { reply, toolsUsed } = await runChat([{ role: "user", text: question }], Number(userId));

console.log("tools:", toolsUsed.join(" → ") || "(tidak ada)");
console.log("\n" + reply);
