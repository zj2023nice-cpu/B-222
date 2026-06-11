import createCall from "./cloud-call";
import { CLOUD_FUNCTIONS } from "../config/index";

const call = createCall("Mood", CLOUD_FUNCTIONS.MOOD);

const moodService = {
  add: (mood, content, dateStr, createTimestamp) =>
    call("add", { mood, content, dateStr, createTimestamp }),
  fetchHistory: () => call("fetch_history"),
};

export default moodService;
