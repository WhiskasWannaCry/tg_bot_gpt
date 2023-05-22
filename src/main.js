import { Telegraf, session } from "telegraf";
import { message } from "telegraf/filters";
import config from 'config'
import {ogg} from './ogg.js'
import { openai } from "./openai.js";
import { code } from 'telegraf/format'
import c from "config";

console.log(config.get("TEST_ENV"))

const INITIAL_SESSION = {
    messages: [],
}

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"))

bot.use(session())

bot.command('new', async (ctx) => {
    ctx.session = INITIAL_SESSION
    await ctx.reply("Жду ваших сообщений")
})

bot.command('start', async (ctx) => {
    ctx.session = INITIAL_SESSION
    await ctx.reply("Жду ваших сообщений")
})


bot.on(message('voice'), async (ctx) => {
    ctx.session ??=INITIAL_SESSION
    try {
        await ctx.reply(code("Сообщение принято и обрабатывается.."))
        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
        const userId = String(ctx.message.from.id)
        console.log(link.href)
        const oggPath = await ogg.create(link.href, userId)
        const mp3Path = await ogg.toMP3(oggPath, userId)

        const start= new Date().getTime();
        const text = await openai.transcription(mp3Path)
        const end = new Date().getTime();
        console.log(`TRANSCRIPTION: ${end - start}ms`);

        ctx.session.messages.push({ role: openai.roles.USER, content: text })

        const response = await openai.chat(ctx.session.messages)
    
        ctx.session.messages.push({ 
            role: openai.roles.ASSISTANT, 
            content: response.content 
        })
        await ctx.reply(response.content)
    } catch (e) {
        console.log("Error voice message: ", e.message)
    }
    
})


bot.on(message('text'), async (ctx) => {
    ctx.session ??=INITIAL_SESSION
    try {
        await ctx.reply(code("Сообщение принято и обрабатывается.."))
        const userId = String(ctx.message.from.id)

        ctx.session.messages.push({ role: openai.roles.USER, content: ctx.message.text })

        const response = await openai.chat(ctx.session.messages)
    
        ctx.session.messages.push({ 
            role: openai.roles.ASSISTANT, 
            content: response.content 
        })
        await ctx.reply(response.content)
    } catch (e) {
        console.log("Error voice message: ", e.message)
    }
    
})

// Работа с текстом
// bot.on(message('text'), async (ctx) => {
//     await ctx.reply(JSON.stringify(ctx.message, null, 2))
// })


console.log('starting...')

bot.launch()

process.once("SIGINT", () => bot.stop('SIGINT'))
process.once("SIGTERM", () => bot.stop('SIGTERM'))