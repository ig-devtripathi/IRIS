const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + process.env.GEMINI_API_KEY;

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contents: [{
      parts: [{ text: "Explain OS workload in 1 sentence" }]
    }]
  })
})
.then(res => res.json())
.then(data => {
  if (data.error) {
    console.error("API ERROR:", data.error.message);
    process.exit(1);
  }
  console.log("SUCCESS:", data.candidates[0].content.parts[0].text);
})
.catch(err => {
  console.error("FETCH ERROR:", err);
  process.exit(1);
});
