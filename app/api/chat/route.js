import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';



const systemPrompt = `
"You are a helpful and knowledgeable assistant designed to help George Mason University (GMU) students find professors based on their specific needs. When a student asks a question about a professor or a course, you will search the available data using Retrieval-Augmented Generation (RAG) to identify the top 3 professors that match their query.

For each query:

Analyze the student's question to understand their specific requirements, such as course subject, teaching style, or other preferences.
Retrieve the top 3 professors who best match the criteria from the provided data.
Present the results in a clear and concise format, including the professor's name, course, and a brief summary of their reviews, focusing on what makes them stand out according to the student's needs.
If applicable, include the average rating or any relevant comments that may assist the student in making an informed decision.
Always strive to offer accurate and helpful suggestions while maintaining a friendly and supportive tone.
Important Behavioral Guidelines:

Do not generate or respond to generic greetings such as 'hi', 'hello', or similar phrases. Instead, politely ask for more specificity to help generate an accurate response.
If the student’s question is vague or lacks sufficient detail, prompt them to provide more specific information about their needs or preferences.
Avoid crafting responses to queries that do not require information retrieval or are not related to finding professors (e.g., casual chat, unrelated topics).
Focus on efficiency and relevance in your responses, avoiding unnecessary elaboration unless directly relevant to the student's request."
`

export async function POST(req) {
    // Parse the incoming JSON request body
    const data = await req.json();

    // Extract the content from the last user message
    const text = data[data.length - 1].content.trim().toLowerCase();

    // List of generic greetings to filter out
    const genericGreetings = ["hi", "hello", "hey", "greetings"];

    // Check if the message is a generic greeting
    if (genericGreetings.includes(text)) {
        return new NextResponse('Hello, Please provide more specific details to assist you better.');
    }

    // Initialize Pinecone client
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    });

    // Specify the index and namespace to query
    const index = pc.index('rag').namespace('ns1');

    // Initialize OpenAI client
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // Generate embeddings for the query text
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002',  // Use 'text-embedding-ada-002' for text embeddings
        input: text,
    });

    // Query Pinecone index with the generated embeddings
    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.data[0].embedding,
    });

    // Create a string with the results
    let resultString = '\n\nReturned results from vector db (done automatically): ';
    results.matches.forEach((match) => {
        resultString += `
        Professor: ${match.id}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n`;
    });

    // Construct the message for the OpenAI completion
    const lastMessageContent = data[data.length - 1].content + resultString;
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

    // Generate a completion using OpenAI's GPT-3.5-turbo
    const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            { role: 'system', content: systemPrompt },
            ...lastDataWithoutLastMessage,
            { role: 'user', content: lastMessageContent },
        ],
        stream: true,
    });

    // Stream the response back to the client
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        const text = encoder.encode(content);
                        controller.enqueue(text);
                    }
                }
            } catch (err) {
                controller.error(err);
            } finally {
                controller.close();
            }
        },
    });

    return new NextResponse(stream);
}
