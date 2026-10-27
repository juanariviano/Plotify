import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// gemini
const chat = await ai.models.generateContent({
    model: process.env.GEMINI_CHAT_MODEL,
    contents: "Saya sapa dalam 1 kalimat."
})
console.log("gemini chat: ", chat.text);

// gemini embedding
const emb = await ai.models.embedContent({
    model: process.env.GEMINI_EMBED_MODEL,
    contents: "One piece adalah anime bajak laut",
    config: {outputDimensionality: 768}
})
console.log("gemini embedding pnjg vektor: ", emb.embeddings[0].values.length); 

// tmdb
const tmdbRes = await fetch("https://api.themoviedb.org/3/search/movie?query=interstellar", {
    headers: {Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`}
})
const tmdb = await tmdbRes.json();
console.log("tmdb: ", tmdb.results?.[0]?.title ?? tmdb);

// anilist
const aniRes = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "applicatiion/json"},
    body: JSON.stringify({
        query: `query {Media(search: "One Piece", type: MANGA) { id title {romaji}}}`,
    })
})
const ani = await aniRes.json();
console.log("anilist: ", ani.data?.Media?.title?.romaji ?? ani);

// open library
const olRes = await fetch("https://openlibrary.org/search.json?q=laskar+pelangi&limit=1");
const ol = await olRes.json();
console.log("open library:", ol.docs?.[0]?.title ?? ol);