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
            "Section 1: Andels Net har lokaler på Østerbro i København",
            "Section 2: internet koster 299 kr om måneden for voksne",
            "Section 3: internet koster 199 kr om måneden for unge",
            "Section 4: internet koster 199 kr om måneden for ældre over 68 år",
            "Section 5: Det kan jeg desværre ikke svare på",
            "Section 6: Jeg kan ikke hjælpe med andet end Andels Net",
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