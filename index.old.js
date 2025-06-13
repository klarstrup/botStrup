const { Bot, InputFile } = require("grammy");
const { spawn } = require("node:child_process");
require('dotenv').config();
const bot = new Bot(process.env.TG_BOT_TOKEN); // <-- put your bot token here (https://t.me/BotFather)

// Reply to any message with "Hi there!".
bot.on("message", async (ctx) => {
  const controller = new AbortController();
  try {
    if (ctx.message.text) {
      await ctx.replyWithChatAction("upload_video");
      const { signal } = controller;
      const ytdlp = spawn(
        "yt-dlp",
        [
          "-f",
          "mp4",
          "--playlist-random",
          "--no-warnings",
          "--playlist-end",
          "1",
          ctx.message.text,
          "-o",
          "-",
        ],
        { signal }
      );

      let lastMessageSent = null;
      ytdlp.stderr.on("data", async (chunk) => {
        const string = String(chunk).trim();
        if (lastMessageSent) {
          const updatedMessage = string.startsWith("\r")
            ? lastMessageSent.text
                .split("\n")
                .map((line, index, list) =>
                  list.length === index - 1 ? string : line
                )
                .join("\n")
            : lastMessageSent.text + "\n" + string;

          if (lastMessageSent.text.trim() !== updatedMessage.trim()) {
            lastMessageSent = await ctx.editMessageText(updatedMessage.trim(), {
              message_id: lastMessageSent.message_id,
            });
          }
        } else {
          lastMessageSent = await ctx.reply(string);
        }
      });

      await ctx.replyWithVideo(new InputFile(ytdlp.stdout), {
        reply_to_message_id: ctx.message.message_id,
      });
    }
  } catch (err) {
    ctx.reply(String(err));
    console.error(err);
    controller.abort(); // Stops the child process
  }
});

bot.start();
