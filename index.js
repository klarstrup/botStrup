const { Bot, InputFile, InlineKeyboard,GrammyError,HttpError } = require("grammy");
const { spawn } = require("node:child_process");
require('dotenv').config()
const bot = new Bot(process.env.TG_BOT_TOKEN); // <-- put your bot token here (https://t.me/BotFather)

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

// Reply to any message with "Hi there!".
bot.on("message", async (ctx) => {
  console.log(`Got message ${ctx.msg.message_id}`);
  if (ctx.chat.type === "private" && ctx.message.text.trim()) {
    let stdErrText;
    try {
    const controller = new AbortController();
      await ctx.replyWithChatAction("upload_video");
      const { signal } = controller;
      const url = new URL(ctx.message.text);
      const ytdlp = spawn(
        "yt-dlp",
        [
          "-f",
          "mp4",
          "--playlist-random",
          "--no-warnings",
          "--playlist-end",
          "1",
          String(url),
          "-o",
          "-",
        ],
        { signal }
      );

      ytdlp.stderr.on("data", async (chunk) => {
        const string = String(chunk).trim();
        stdErrText = stdErrText
          ? string.startsWith("\r")
            ? stdErrText
                .split("\n")
                .map((line, index, list) =>
                  list.length === index - 1 ? string : line
                )
                .join("\n")
            : stdErrText + "\n" + string
          : string;
      });

      await ctx.replyWithVideo(new InputFile(ytdlp.stdout), {
        reply_to_message_id: ctx.message.message_id,
      });
    } catch (err) {
      ctx.reply(String(stdErrText));
      ctx.reply(String(err));

     // throw err;
    }
  }
  console.log(`Dealt with message ${ctx.msg.message_id}`);
});

bot.start();
