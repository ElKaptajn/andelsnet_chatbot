import { OPENAI_KEY } from "$env/static/private";
import type { ChatCompletionRequestMessage, CreateChatCompletionRequest, ChatCompletionRequestMessageRoleEnum  } from "openai";
import type { RequestHandler } from "./$types";
import { getTokens } from "$lib/tokenizer";
import { json } from "@sveltejs/kit";
import type { Config } from "@sveltejs/adapter-vercel";

export const config: Config = {
    runtime: 'edge'
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        if(!OPENAI_KEY){
            throw new Error("OpenAI key not set");
        }

        const requestData = await request.json();

        if(!requestData){
            throw new Error("No request data");
        }

        const reqMessages: ChatCompletionRequestMessage[] = requestData.messages

        if(!reqMessages){
            throw new Error("No messageprovided");
        }

        let tokenCount = 0;

        reqMessages.forEach((msg) => {
            const tokens = getTokens(msg.content);
            tokenCount += tokens;
        });

        const moderationRes = await fetch("https://api.openai.com/v1/moderations", {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_KEY}`
            },
            method: "POST",
            body: JSON.stringify({
                input: reqMessages[reqMessages.length - 1].content,
            })
        })

        const moderationData = await moderationRes.json();
        const[results] = moderationData.results;
        
        if(results.flagged) {
            throw new Error("Message flagged by OpenAI");
        }

        const prompt = "You are a chat bot for a Danish company called Andels Net. Your name is Andelsbot. You wont answerquestions about anything else than Andels Net. Please use the information from the provided sections to answer the user's questions.";
        tokenCount += getTokens(prompt);

        // Lav så den automatisk sletter de ældste beskeder hvis der er for mange tokens
        if(tokenCount >= 4000) {
            throw new Error("Too many tokens");
        }

        //Knowledge database
        const knowledgeDatabase = [
            "Section 1: If your internet is slow or unstable, it can be due to several reasons. Andels.net only supplies the internet up to the wall socket, but then it's up to your own equipment, for example your router, to give you good wireless internet at home.",
            "Section 2: If you have a router that is more than a few years old, then it can cause problems. If you instead buy or rent a new router that supports the fast 5 GHz frequency, there are good opportunities for you to get a faster and more stable connection.",
            "Section 3: Many internet users use the so-called 2.4 GHz frequency band, which is often disturbed by, among other things, microwave ovens, baby monitors, and where you lose up to 80% of your speed. What you can do is therefore ensure that both your router and your computer can handle the fast 5 GHz frequency band - and use it. If you have an older computer that does not have a 5 GHz network card, there are typically two options for you. 1. Have the network card in the computer replaced by a professional dealer. 2. Buy a network card in the form of USB - this USB can be plugged into your computer and it can replace the network card.",
            "Section 4: If your router is placed inappropriately in relation to your computer, you can try to place the router as centrally as possible in relation to where you will use your wireless internet. It is also important that it is not hidden away in a cupboard or similar.",
            "Section 5: Feel free to contact us if you want to know more about routers and how to get the most out of your internet connection.",
            "Section 6: When Andels.net installs internet in your home, we place a small plastic box, the size of a box of matches, on your wall. The box contains a telephone plug and a network plug. The most common is that you connect a wireless transmitter, a router, directly to the plastic box in your wall. If you are not using a wireless transmitter, you can also connect the wall socket and your computer with a regular network cable.",
            "Section 7: Follow 10 quick steps to connect your router from Andels.net to the Internet: 1) Turn on your computer. 2) Unpack the router. 3) Place the router centrally in your home. 4) Connect the power to the router. The power source is located in the router box. 5) Wait for the router to 'boot up'. 6) Now take the data cable that is in the router box. Connect one end of the cable to the wall socket and the other end to the red input on the router marked 'internet'. 7) When all 4 LEDs on the router light up green, you are ready to search for your wireless network on your computer. Find your wireless network on your computer. 8) Enter the code for the wireless network written on the bottom of the router. 9) You are then ready to go online.",
            "Section 8: If you have a router that is more than a few years old and does not support the fast 5 GHz frequency, there is a good chance that you can get a faster and more stable connection by buying or renting a new router. If you are in doubt, or if you are considering changing routers, you are very welcome to contact us for advice and guidance.",
            "Section 9: There are no restrictions on the connection You can surf, download and upload as much as you want.",
            "Section 10: Even if the entire property is browsing at the same time, you won't be able to notice it. The capacity is so large that you will not experience any decrease in the speed from your property to the Internet.",
            "Section 11: However, if you use the so-called 2.4 GHz frequency band, you will generally - regardless of whether there are many people using the Internet at the same time or not - risk experiencing instability. To avoid this, you can consider changing the network card in your computer to 5 GHz, just as you can consider changing the router. This is especially worth considering if you have an older router. Contact us for advice in the area.",
            "Section 12: Andels.net's speeds apply up to the wall socket that is set up in your home. From here it is up to your own equipment, for example your router, to provide you with wireless internet at home.",
            "Section 13: If you experience low internet speed, we typically suggest a speed measurement. With a measurement, we can assess whether - contrary to expectations - there should be something wrong with the speed that we deliver, or whether it should be your equipment that needs to be optimised. In any case, we will always help you so that you can have the best opportunities for a good internet experience.",
            "Section 14: If you want to measure the speed, you can easily do so by plugging a cable from the wall socket directly into your computer - i.e. around your router. You can then use websites for speed tests, for example speedtest.net",
            "Section 15: When you are on Speedtest's website, you just have to click on the \"go\" button, after which a speed measurement is automatically started.",
            "Section 16: If you get a low number from the test, please contact us immediately and we will help you further. However, a low measurement has not yet occurred in Andels.net's history. If you get an expectedly high measurement, this means that your perceived low speed is probably due to your own equipment, for example your router.",
            "Section 17: You always get  the speed you pay for except 10 percent of the speed which is used for overhead. if you experience problems with the speed, you can try a speed test. Remember to measure without Wifi at the plug in the wall.",
            "Section 18: Andels.net does not provide telephony, but all our connections can handle IP telephony. Contact us for the possibility of configuration and to ensure that the connection is prepared for IP telephony.",
            "Section 19: There is no reason not to choose Andels.net. In short, Andels.net delivers a super good product with the country's best service at some of the market's best prices.",
            "Section 20: More than 700 housing associations have already secured cooperation with Andels.net for the provision of internet. And they are very satisfied. Andels.net is one of Denmark's most popular internet providers, and we are ranked at the top on the reviewer site Trustpilot, among other things. We are a rock-solid and professionally competent company - voted gazelle company by Dagbladet Børsen four years in a row - most recently in 2017.",
            "Section 21: We are experts in the provision of fiber internet, which is the clear choice in terms of stability and high capacity. We guarantee high speeds so everyone in the family can be online and surf around at full speed at the same time.",
            "Section 22: With us, you are also guaranteed professional network management. We monitor our network 24 hours a day, 365 days a year, which guarantees high uptimes and low response times.",
            "Section 23: You can easily check whether you can get internet from Andels.net by going to our registration page at: https://andels.net//faa-andelsnet.php.",
            "Section 24: Andels.net can be responsible for the delivery of cable TV and TV via the Internet. Contact us for more information.",
            "Section 25: If you want to cancel your subscription, you simply send an email with your customer number or full name and address to info@andels.net, after which the cancellation will be confirmed by email. Please write why you are canceling or if there is something wrong that we could do better in the future.",
            "Section 26: You can contact us at the office, as well as by e-mail and phone: Monday-Thursday at 10-18, Friday at 10-17.30, Saturday at 12-16 (Only via e-mail and phone), Customer visit: Wednesday from 10-18, Extended support for Premium customers: Monday-Thursday at 18-20, Friday at 17.30-20.",
            "Section 27: We are ready on phone +45 36 92 62 32",
            "Section 28: If you want to test your speed, the plug must be inserted directly from the wall to the computer. Switch off any other connected devices such as printers etc. Turn off virus protection, wireless network card, etc. off and close all running programs so that there is as little as possible that eats data and disturbs the measurement.",
            "Section 29: Here are 3 important areas that can have an influence on a speed measurement: 1) Your computer's network card may be limited to a lower speed than 1000 Mbit. If, for example, the network card can only handle 100 Mbit, then you cannot measure more than that either. 2) Approx. 10 percent of the speed is used for overhead, which is an information layer in the data that ensures that it arrives correctly, therefore we can only guarantee 900Mbit on our 1000Mbit connections. 3) The server you are measuring against can be loaded and show very different measurements on the same connection depending on the time. So feel free to try at several different times.",
            "Section 30: You can see the speed test as an indicator of whether there is something wrong with the connection on the way to your wall socket, or rather the router is causing the problems. Therefore, we cannot guarantee wireless speeds",
            "Section 31: A plaster wall typically attenuates the WiFi signal by 3 dB (corresponding to half of the signal being absorbed by the wall), and more if the plasterboard is mounted on a metal skeleton. The same applies to a pair of French doors with single-layer glass. Quote from ComputerWorld.dk",
            "Section 32: There are many factors that influence the wireless speed. In addition to the router itself, it i.a. the layout of the measurement address, the surrounding addresses and materials in walls, wireless network cards and which software runs on your devices.",
            "Section 33: If you experience problems achieving the full speed, do not hesitate to contact our support by calling +45 36 92 62 32 or writing to support@andels.net."
        ];
          
          const databaseMessages = knowledgeDatabase.map((section) => ({ role: "assistant" as ChatCompletionRequestMessageRoleEnum, content: section }));
          const messages: ChatCompletionRequestMessage[] = [
            { role: "system", content: prompt },
            ...databaseMessages,
            ...reqMessages,
          ];

        // const messages: ChatCompletionRequestMessage[] = [
        //     {role: 'system', content: prompt},
        //     ...reqMessages
        // ]

        const ChatRequestOpts:CreateChatCompletionRequest = {
            model: 'gpt-3.5-turbo',
            messages,
            temperature: 0.5,
            stream: true,
        }

        const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            headers: {
                Authorization: `Bearer ${OPENAI_KEY}`,
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify(ChatRequestOpts)
        })

        if (!chatResponse.ok) {
            const err = await chatResponse.json();
            throw new Error(err);
        }

        return new Response(chatResponse.body, {
            headers: {
                'Content-Type': 'text/event-stream'
            }
        })

    } catch(err) {
        console.log(err);
        return json({error: "There was an error processing your request"}, {status: 500});
    }
};
