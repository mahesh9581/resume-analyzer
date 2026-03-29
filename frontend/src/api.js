import axios from "axios";

const API = axios.create({ 
  baseURL: "https://resume-analyzer-2-sbn4.onrender.com/api" 
});

export async function analyzeFile(file, jobDesc = "") {
  const form = new FormData();
  form.append("resume", file);
  if (jobDesc.trim()) form.append("jobDesc", jobDesc);
  const { data } = await API.post("/analyze/file", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.analysis;
}

export async function analyzeText(resumeText, jobDesc = "") {
  const { data } = await API.post("/analyze/text", { resumeText, jobDesc });
  return data.analysis;
}
