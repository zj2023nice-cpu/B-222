import createCall from "./cloud-call";

const call = createCall("Mood", "mood_service");

const moodService = {
  add: (mood, content, dateStr, createTimestamp) =>
    call("add", { mood, content, dateStr, createTimestamp }),
  fetchHistory: () => call("fetch_history"),
};

export default moodService;
