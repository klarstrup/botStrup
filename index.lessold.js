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
  if (ctx.chat.type === "private" && ctx.message.text.trim()) {
    const controller = new AbortController();
    let stdErrText;
    try {
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
      console.error(err);
     try{ controller.abort();}catch{} // Stops the child process
    throw err;
}
  }
});
bot.on("inline_query", async (ctx) => {
  if (!ctx.inlineQuery.query.trim()) return ctx.answerInlineQuery([]);

  let stdErrText;
  const controller = new AbortController();
  try {
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
        ctx.inlineQuery.query.trim(),
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

    const videoMessage = await ctx.api.sendVideo(
      ctx.inlineQuery.from.id,
      new InputFile(ytdlp.stdout),
      { disable_notification: false }
    );
    await ctx.answerInlineQuery([
      {
        type: "video",
        id: ctx.inlineQuery.query.trim().slice(0, 64) || "grammy-website",
        title: "BOTTED",
        mime_type: "video/mp4",
        thumb_url:
          "https://pbs.twimg.com/profile_images/1517659818206638085/XaTK-amN_x96.jpg",
        video_file_id: videoMessage.video.file_id,
      },
    ]);
    await ctx.api.deleteMessage(
      ctx.inlineQuery.from.id,
      videoMessage.message_id
    );
  } catch (err) {
    console.error(err);
    try{controller.abort();}catch{} // Stops the child process
  
throw err;}
});

bot.start();
