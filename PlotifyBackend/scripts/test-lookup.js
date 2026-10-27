import { lookupExternal } from "../src/utils/externalMedia.js";

const screen = await lookupExternal("attack on titan", "screen");
console.log("SCREEN:");
console.table(screen.map(({ external_source, external_id, title, year }) => ({ external_source, external_id, title, year })));

const read = await lookupExternal("one piece", "read");
console.log("READ:");
console.table(read.map(({ external_source, external_id, title, year }) => ({ external_source, external_id, title, year })));
