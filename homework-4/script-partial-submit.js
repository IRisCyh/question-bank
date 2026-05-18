const HOMEWORK_ID = "HW4-Particles";
const TEACHER_SUBMISSION_ENDPOINT = "https://script.google.com/macros/s/AKfycbxT4mGXGyIVFRb6yrNGIbm57CIt1uoxpnPtoYz5oPYsmy4ST7qH6SfWTh0xk5EYjvxVag/exec";
const TEACHER_SUBMISSION_MODE = "no-cors";
const FALLBACK_ROSTER = [
  {
    className: "Y12C",
    students: [
      "Amelia Chen",
      "Ben Carter",
      "Chloe Evans",
      "Daniel Green",
      "Ella Hughes",
      "Finley Khan",
      "Grace Li",
      "Haris Patel",
      "Isla Wong",
      "Jacob Smith"
    ]
  }
];

const state = {
  questions: [],
  roster: [],
  selectedClassName: "",
  selectedStudentName: "",
  started: false,
  currentIndex: 0,
  answers: {},
  longAnswers: {},
  shownMarkSchemes: {},
  selfAssessment: {},
  submitted: {},
  questionMessages: {},
  score: 0,
  submissionStatus: ""
};

const els = {
  startPanel: document.querySelector("#student-start-panel"),
  startForm: document.querySelector("#student-start-form"),
  classSelect: document.querySelector("#class-select"),
  studentSelect: document.querySelector("#student-select"),
  startButton: document.querySelector("#start-quiz-button"),
  startStatus: document.querySelector("#student-start-status"),
  quizPanel: document.querySelector("#quiz-panel"),
  studentIdentityLabel: document.querySelector("#student-identity-label"),
  score: document.querySelector("#score"),
  position: document.querySelector("#question-position"),
  type: document.querySelector("#question-type"),
  title: document.querySelector("#question-title"),
  text: document.querySelector("#question-text"),
  tags: document.querySelector("#topic-tags"),
  form: document.querySelector("#answer-form"),
  feedback: document.querySelector("#feedback"),
  questionsList: document.querySelector("#questions-list"),
  prev: document.querySelector("#prev-button"),
  submit: document.querySelector("#submit-button"),
  next: document.querySelector("#next-button"),
  review: document.querySelector("#review-section"),
  finalScore: document.querySelector("#final-score"),
  mistakes: document.querySelector("#mistakes-list"),
  teacherSubmission: document.querySelector("#teacher-submission-section"),
  teacherSubmissionForm: document.querySelector("#teacher-submission-form"),
  teacherSubmissionIdentity: document.querySelector("#teacher-submission-identity"),
  teacherSubmit: document.querySelector("#teacher-submit-button"),
  submissionStatus: document.querySelector("#teacher-submission-status"),
  submissionScoreSummary: document.querySelector("#submission-score-summary")
};

async function loadQuestions() {
  if (window.HOMEWORK_QUESTIONS && Array.isArray(window.HOMEWORK_QUESTIONS.questions)) {
    state.questions = window.HOMEWORK_QUESTIONS.questions;
    return;
  }

  try {
    const response = await fetch("questions.json?v=20260518-homework4");
    if (!response.ok) {
      throw new Error(`Could not load questions.json (${response.status})`);
    }
    const data = await response.json();
    state.questions = data.questions;
  } catch (error) {
    els.text.innerHTML = `<div class="error-message">${escapeHtml(error.message)}</div>`;
    els.submit.disabled = true;
    els.next.disabled = true;
    els.prev.disabled = true;
  }
}

async function init() {
  await Promise.all([
    loadQuestions(),
    loadRoster()
  ]);
  renderStartPanel();
}

async function loadRoster() {
  state.roster = FALLBACK_ROSTER;
  if (!TEACHER_SUBMISSION_ENDPOINT) return;

  try {
    const roster = await fetchRosterJsonp();
    if (Array.isArray(roster) && roster.length) {
      state.roster = roster;
    }
  } catch (error) {
    state.roster = FALLBACK_ROSTER;
  }
}

function fetchRosterJsonp() {
  return new Promise((resolve, reject) => {
    const callbackName = `receiveRoster_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const separator = TEACHER_SUBMISSION_ENDPOINT.includes("?") ? "&" : "?";
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Roster request timed out."));
    }, 8000);

    window[callbackName] = data => {
      cleanup();
      resolve(data.roster || []);
    };

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    script.onerror = () => {
      cleanup();
      reject(new Error("Could not load roster."));
    };

    script.src = `${TEACHER_SUBMISSION_ENDPOINT}${separator}action=roster&callback=${encodeURIComponent(callbackName)}`;
    document.head.appendChild(script);
  });
}

function renderStartPanel() {
  els.quizPanel.hidden = true;
  els.review.hidden = true;
  els.teacherSubmission.hidden = true;
  els.startPanel.hidden = false;

  const roster = state.roster.filter(group => group.className && Array.isArray(group.students) && group.students.length);
  els.classSelect.innerHTML = roster
    .map(group => `<option value="${escapeHtml(group.className)}">${escapeHtml(group.className)}</option>`)
    .join("");

  if (!roster.length) {
    els.classSelect.innerHTML = "";
    els.studentSelect.innerHTML = "";
    els.startButton.disabled = true;
    els.startStatus.textContent = "No student roster found. Fill the Students tab in Google Sheets, then redeploy Apps Script.";
    els.startStatus.className = "submission-status visible";
    return;
  }

  els.startButton.disabled = false;
  els.startStatus.textContent = "";
  els.startStatus.className = "submission-status";
  updateStudentSelect();
}

function updateStudentSelect() {
  const selectedClass = els.classSelect.value;
  const group = state.roster.find(item => item.className === selectedClass);
  const students = group ? group.students : [];
  els.studentSelect.innerHTML = students
    .map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join("");
}

function startQuiz(event) {
  event.preventDefault();
  state.selectedClassName = els.classSelect.value;
  state.selectedStudentName = els.studentSelect.value;

  if (!state.selectedClassName || !state.selectedStudentName) {
    els.startStatus.textContent = "Choose your class and name before starting.";
    els.startStatus.className = "submission-status visible";
    return;
  }

  state.started = true;
  els.startPanel.hidden = true;
  els.quizPanel.hidden = false;
  renderAllQuestions();
}

function renderAllQuestions() {
  els.quizPanel.hidden = false;
  els.review.hidden = false;
  els.teacherSubmission.hidden = false;
  els.position.textContent = `${state.questions.length} questions`;
  els.type.textContent = "Multiple choice";
  els.studentIdentityLabel.textContent = `${state.selectedStudentName} (${state.selectedClassName})`;
  els.questionsList.innerHTML = "";

  state.questions.forEach((question, index) => {
    const article = document.createElement("article");
    article.className = "question-card";
    article.id = `question-${question.id}`;

    const header = document.createElement("div");
    header.className = "question-card-header";
    header.innerHTML = `
      <span>Question ${index + 1} of ${state.questions.length}</span>
      <h3>${escapeHtml(question.id)}</h3>
    `;
    article.appendChild(header);

    const text = document.createElement("div");
    text.className = "question-text";
    renderRichText(text, question.questionText || question.fullQuestionText || "", question.media || []);
    article.appendChild(text);

    appendChoiceTables(article, question.choiceTables || []);

    const form = document.createElement("form");
    form.className = "answer-form";
    renderMultipleChoiceInto(question, form);
    article.appendChild(form);

    const actions = document.createElement("div");
    actions.className = "question-actions";
    const submit = document.createElement("button");
    submit.type = "button";
    submit.textContent = state.submitted[question.id] ? "Submitted" : "Submit";
    submit.disabled = Boolean(state.submitted[question.id]);
    submit.addEventListener("click", () => submitQuestion(question.id));
    actions.appendChild(submit);
    article.appendChild(actions);

    const feedback = document.createElement("div");
    feedback.className = "feedback";
    feedback.hidden = true;
    feedback.setAttribute("aria-live", "polite");
    renderQuestionFeedback(question, form, feedback);
    article.appendChild(feedback);

    els.questionsList.appendChild(article);
  });

  recalculateScore();
  updateScore();
  renderReview();
  renderTeacherSubmission();
}

function renderQuestion() {
  const question = getCurrentQuestion();
  if (!question) return;

  els.position.textContent = `Question ${state.currentIndex + 1} of ${state.questions.length}`;
  els.type.textContent = question.type === "multiple-choice" ? "Multiple choice" : "Structured calculation";
  els.studentIdentityLabel.textContent = `${state.selectedStudentName} (${state.selectedClassName})`;
  els.title.textContent = question.id;
  renderRichText(els.text, question.questionText || question.fullQuestionText || "", question.media || []);
  appendChoiceTables(els.text, question.choiceTables || []);
  els.tags.innerHTML = (question.topicTags || [])
    .map(tag => `<span>${escapeHtml(tag)}</span>`)
    .join("");

  els.form.innerHTML = "";
  els.feedback.hidden = true;
  els.feedback.className = "feedback";

  if (question.type === "multiple-choice") {
    renderMultipleChoice(question);
  } else {
    renderLongAnswer(question);
  }

  renderStoredFeedback(question);
  updateButtons();
  updateScore();
  renderReview();
  renderTeacherSubmission();
}

function renderMultipleChoice(question) {
  renderMultipleChoiceInto(question, els.form);
}

function renderMultipleChoiceInto(question, target) {
  Object.entries(question.options).forEach(([letter, text]) => {
    const optionId = `${question.id}-${letter}`;
    const label = document.createElement("label");
    label.className = "option-row";
    label.htmlFor = optionId;

    const input = document.createElement("input");
    input.type = "radio";
    input.name = question.id;
    input.id = optionId;
    input.value = letter;
    input.checked = state.answers[question.id] === letter;
    input.disabled = Boolean(state.submitted[question.id]);
    input.addEventListener("change", () => {
      state.answers[question.id] = letter;
      delete state.questionMessages[question.id];
      markSelectedOption(target, letter);
    });

    const content = document.createElement("div");
    content.className = "option-content";
    const optionText = cleanExtractedPlaceholders(text).trim();
    const optionMedia = (question.optionMedia && question.optionMedia[letter]) || [];
    content.innerHTML = `<span class="option-label">${letter}</span>${optionText ? ` ${formatInlineText(optionText)}` : ""}`;
    if (optionMedia.length) {
      content.appendChild(createMediaStrip(optionMedia, "option-media"));
    }

    label.append(input, content);
    target.appendChild(label);
  });

  markSelectedOption(target, state.answers[question.id]);
}

function appendChoiceTables(container, tables) {
  (tables || []).forEach(tableData => {
    const wrapper = document.createElement("div");
    wrapper.className = "choice-table-wrap";

    const table = document.createElement("table");
    table.className = "choice-table";

    (tableData.rows || []).forEach((row, rowIndex) => {
      const tr = document.createElement("tr");
      (row || []).forEach((cell, cellIndex) => {
        const tag = rowIndex === 0 && !((row[0] && row[0].text) || "").trim() ? "th" : "td";
        const td = document.createElement(tag);
        if (cellIndex === 0 && /^[A-D]$/.test((cell.text || "").trim())) {
          td.className = "choice-letter-cell";
        }
        renderChoiceTableCell(td, cell);
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    wrapper.appendChild(table);
    container.appendChild(wrapper);
  });
}

function renderChoiceTableCell(cellElement, cell) {
  const text = (cell && cell.text ? cell.text : "").trim();
  if (text) {
    const textSpan = document.createElement("span");
    textSpan.className = "choice-table-text";
    textSpan.innerHTML = formatInlineText(text);
    cellElement.appendChild(textSpan);
  }

  (cell && cell.media ? cell.media : []).forEach(item => {
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.alt || "";
    img.loading = "lazy";
    img.className = item.kind === "formula" ? "choice-table-formula" : "choice-table-diagram";
    cellElement.appendChild(img);
  });
}

function markSelectedOption(root, selected) {
  const rows = [...root.querySelectorAll(".option-row")];
  rows.forEach(row => {
    const input = row.querySelector("input");
    row.classList.toggle("selected", Boolean(selected) && input.value === selected);
  });
}

function submitQuestion(questionId) {
  const question = state.questions.find(item => item.id === questionId);
  if (!question) return;

  if (!state.answers[question.id]) {
    state.questionMessages[question.id] = "Choose an answer before submitting.";
    renderAllQuestions();
    document.querySelector(`#question-${question.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  delete state.questionMessages[question.id];
  state.submitted[question.id] = true;
  recalculateScore();
  renderAllQuestions();
  document.querySelector(`#question-${question.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderLongAnswer(question) {
  const wrapper = document.createElement("div");
  wrapper.className = "subparts";

  (question.subparts || []).forEach(subpart => {
    const answerKey = `${question.id}:${subpart.id}:working`;
    const showKey = `${question.id}:${subpart.id}:shown`;
    const section = document.createElement("section");
    section.className = "subpart long-subpart";
    section.innerHTML = `<h3>${escapeHtml(subpart.id)} (${escapeHtml(String(subpart.marks))} mark${subpart.marks === 1 ? "" : "s"})</h3>`;

    const subpartText = document.createElement("div");
    subpartText.className = "subpart-text";
    renderRichText(subpartText, subpart.questionText, subpart.media || []);
    section.appendChild(subpartText);

    const textarea = document.createElement("textarea");
    textarea.className = "long-answer";
    textarea.placeholder = "Write your working or answer here.";
    textarea.value = state.longAnswers[answerKey] || "";
    textarea.addEventListener("input", event => {
      state.longAnswers[answerKey] = event.target.value;
    });
    section.appendChild(textarea);

    const tools = document.createElement("div");
    tools.className = "subpart-tools";

    const markButton = document.createElement("button");
    markButton.type = "button";
    markButton.className = "mark-scheme-button";
    markButton.textContent = state.shownMarkSchemes[showKey] ? "Hide mark scheme" : "Show mark scheme";
    markButton.addEventListener("click", () => {
      state.shownMarkSchemes[showKey] = !state.shownMarkSchemes[showKey];
      renderQuestion();
    });
    tools.appendChild(markButton);

    const score = calculateSubpartSelfScore(question.id, subpart);
    const summary = document.createElement("p");
    summary.className = "self-score";
    summary.textContent = `Self-assessed marks: ${score} / ${subpart.marks}`;
    tools.appendChild(summary);
    section.appendChild(tools);

    if (state.shownMarkSchemes[showKey]) {
      section.appendChild(createSubpartMarkScheme(question.id, subpart));
    }

    wrapper.appendChild(section);
  });

  const total = calculateQuestionSelfScore(question);
  const totalScore = document.createElement("div");
  totalScore.className = "long-answer-total";
  totalScore.textContent = `Self-assessed total: ${total} / ${question.marks}`;

  els.form.append(wrapper, totalScore);
}

function submitCurrent() {
  const question = getCurrentQuestion();
  if (!question) return;

  if (question.type === "multiple-choice" && !state.answers[question.id]) {
    showFeedback("Choose an answer before submitting.", "incorrect");
    return;
  }

  state.submitted[question.id] = true;
  recalculateScore();
  renderQuestion();
}

function renderStoredFeedback(question) {
  if (!state.submitted[question.id]) return;

  if (question.type === "multiple-choice") {
    const selected = state.answers[question.id];
    const isCorrect = selected === question.correctAnswer;
    markOptions(question, selected);
    showFeedback(
      `<h3>${isCorrect ? "Correct" : "Not quite"}</h3>
       <p>Your answer: ${escapeHtml(selected)}. Correct answer: ${escapeHtml(question.correctAnswer)}.</p>
       <p>${escapeHtml(question.explanation || "")}</p>`,
      isCorrect ? "correct" : "incorrect",
      true
    );
  }
}

function renderQuestionFeedback(question, form, feedback) {
  if (state.questionMessages[question.id]) {
    feedback.hidden = false;
    feedback.className = "feedback incorrect";
    feedback.textContent = state.questionMessages[question.id];
    return;
  }

  if (!state.submitted[question.id]) return;

  const selected = state.answers[question.id];
  const isCorrect = selected === question.correctAnswer;
  markOptions(question, selected, form);
  feedback.hidden = false;
  feedback.className = `feedback ${isCorrect ? "correct" : "incorrect"}`;
  feedback.innerHTML = `
    <h4>${isCorrect ? "Correct" : "Not quite"}</h4>
    <p>Your answer: ${escapeHtml(selected)}. Correct answer: ${escapeHtml(question.correctAnswer)}.</p>
  `;
}

function markOptions(question, selected, root = els.form) {
  const rows = [...root.querySelectorAll(".option-row")];
  rows.forEach(row => {
    const input = row.querySelector("input");
    row.classList.toggle("selected", input.value === selected);
    row.classList.toggle("correct", input.value === question.correctAnswer);
    row.classList.toggle("incorrect", input.value === selected && selected !== question.correctAnswer);
  });
}

function renderMarkScheme(question) {
  const subparts = (question.subparts || []).map(subpart => {
    const points = (subpart.markSchemePoints || [])
      .map(point => `<li>${formatInlineText(cleanExtractedPlaceholders(point))}</li>`)
      .join("");
    const media = renderMediaHtml(subpart.markSchemeMedia || [], "mark-scheme-media");
    return `
      <h3>${escapeHtml(subpart.id)} mark scheme</h3>
      <ul>${points}</ul>
      ${media}
    `;
  }).join("");

  return `<h3>Mark scheme</h3>${subparts}`;
}

function createSubpartMarkScheme(questionId, subpart) {
  const panel = document.createElement("div");
  panel.className = "subpart-mark-scheme";

  const heading = document.createElement("h4");
  heading.textContent = `${subpart.id} mark scheme`;
  panel.appendChild(heading);

  const list = document.createElement("ol");
  list.className = "mark-point-list";

  (subpart.markSchemePoints || []).forEach((point, index) => {
    const key = selfAssessmentKey(questionId, subpart.id, index);
    const item = document.createElement("li");
    item.className = "mark-point";

    const label = document.createElement("label");
    label.className = "mark-point-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(state.selfAssessment[key]);
    checkbox.addEventListener("change", event => {
      state.selfAssessment[key] = event.target.checked;
      renderQuestion();
    });

    const span = document.createElement("span");
    span.innerHTML = formatInlineText(cleanExtractedPlaceholders(point));

    label.append(checkbox, span);
    item.appendChild(label);
    list.appendChild(item);
  });

  panel.appendChild(list);

  if (subpart.markSchemeMedia && subpart.markSchemeMedia.length) {
    const mediaWrap = document.createElement("div");
    mediaWrap.innerHTML = renderMediaHtml(subpart.markSchemeMedia, "mark-scheme-media");
    panel.appendChild(mediaWrap.firstElementChild);
  }

  const score = calculateSubpartSelfScore(questionId, subpart);
  const scoreLine = document.createElement("p");
  scoreLine.className = "self-score mark-scheme-score";
  scoreLine.textContent = `Checked mark points: ${countCheckedMarkPoints(questionId, subpart)}. Self-assessed marks for this part: ${score} / ${subpart.marks}.`;
  panel.appendChild(scoreLine);

  return panel;
}

function showFeedback(content, status = "", isHtml = false) {
  els.feedback.hidden = false;
  els.feedback.className = `feedback ${status}`.trim();
  if (isHtml) {
    els.feedback.innerHTML = content;
  } else {
    els.feedback.textContent = content;
  }
}

function updateButtons() {
  const question = getCurrentQuestion();
  els.prev.disabled = state.currentIndex === 0;
  els.next.disabled = state.currentIndex === state.questions.length - 1;
  els.submit.textContent = question.type === "multiple-choice" ? "Submit" : "Show mark scheme";
  els.submit.disabled = Boolean(state.submitted[question.id]) && question.type === "multiple-choice";
  els.submit.hidden = question.type !== "multiple-choice";
}

function goTo(delta) {
  const nextIndex = state.currentIndex + delta;
  if (nextIndex < 0 || nextIndex >= state.questions.length) return;
  state.currentIndex = nextIndex;
  renderQuestion();
}

function recalculateScore() {
  state.score = state.questions
    .filter(question => question.type === "multiple-choice")
    .reduce((total, question) => {
      const correct = state.submitted[question.id] && state.answers[question.id] === question.correctAnswer;
      return total + (correct ? question.marks : 0);
    }, 0);
}

function updateScore() {
  els.score.textContent = `${state.score} / ${getMultipleChoiceMaxScore()}`;
}

function getMultipleChoiceQuestions() {
  return state.questions.filter(question => question.type === "multiple-choice");
}

function getStructuredQuestions() {
  return state.questions.filter(question => question.type !== "multiple-choice");
}

function getMultipleChoiceMaxScore() {
  return getMultipleChoiceQuestions().reduce((total, question) => total + (question.marks || 0), 0);
}

function getStructuredMaxScore(questionId) {
  const question = state.questions.find(item => item.id === questionId);
  return question ? question.marks || 0 : 0;
}

function areAllMultipleChoiceSubmitted() {
  return getMultipleChoiceQuestions().every(question => state.submitted[question.id]);
}

function getMistakeQuestions() {
  return getMultipleChoiceQuestions().filter(question => {
    return state.submitted[question.id] && state.answers[question.id] !== question.correctAnswer;
  });
}

function getTotalScoreSummary() {
  const structuredQuestions = getStructuredQuestions();
  const q10 = structuredQuestions.find(question => question.id === "Q10");
  const q11 = structuredQuestions.find(question => question.id === "Q11");
  const q10Score = q10 ? calculateQuestionSelfScore(q10) : 0;
  const q11Score = q11 ? calculateQuestionSelfScore(q11) : 0;
  const mcqMax = getMultipleChoiceMaxScore();
  const q10Max = q10 ? q10.marks || 0 : 0;
  const q11Max = q11 ? q11.marks || 0 : 0;
  const totalScore = state.score + q10Score + q11Score;
  const totalMax = mcqMax + q10Max + q11Max;

  return {
    mcqScore: state.score,
    mcqMax,
    q10Score,
    q10Max,
    q11Score,
    q11Max,
    totalScore,
    totalMax,
    percentage: totalMax ? Math.round((totalScore / totalMax) * 1000) / 10 : 0
  };
}

function calculateQuestionSelfScore(question) {
  return (question.subparts || []).reduce((total, subpart) => {
    return total + calculateSubpartSelfScore(question.id, subpart);
  }, 0);
}

function calculateSubpartSelfScore(questionId, subpart) {
  return Math.min(countCheckedMarkPoints(questionId, subpart), subpart.marks || 0);
}

function countCheckedMarkPoints(questionId, subpart) {
  return (subpart.markSchemePoints || []).reduce((total, _point, index) => {
    return total + (state.selfAssessment[selfAssessmentKey(questionId, subpart.id, index)] ? 1 : 0);
  }, 0);
}

function selfAssessmentKey(questionId, subpartId, pointIndex) {
  return `${questionId}:${subpartId}:mark-point:${pointIndex}`;
}

function renderReview() {
  const allMultipleChoiceSubmitted = areAllMultipleChoiceSubmitted();

  els.review.hidden = !state.started;
  if (els.review.hidden) return;

  const mistakes = getMistakeQuestions();

  els.finalScore.textContent = `Multiple-choice score: ${state.score} / ${getMultipleChoiceMaxScore()}`;

  if (mistakes.length === 0) {
    els.mistakes.innerHTML = allMultipleChoiceSubmitted
      ? "<p>No submitted multiple-choice mistakes.</p>"
      : "<p>Mistakes will appear here as you answer.</p>";
    return;
  }

  els.mistakes.innerHTML = mistakes.map(question => `
    <article class="mistake-item">
      <h3>${escapeHtml(question.id)}</h3>
      <p>${formatInlineText(cleanExtractedPlaceholders(question.questionText))}</p>
      <p><strong>Your answer:</strong> ${escapeHtml(state.answers[question.id] || "No answer")}</p>
      <p><strong>Correct answer:</strong> ${escapeHtml(question.correctAnswer)}${cleanExtractedPlaceholders(question.options[question.correctAnswer]).trim() ? `. ${formatInlineText(cleanExtractedPlaceholders(question.options[question.correctAnswer]))}` : ""}</p>
      ${renderMediaHtml((question.optionMedia && question.optionMedia[question.correctAnswer]) || [], "option-media")}
      <p>${formatInlineText(question.explanation || "")}</p>
    </article>
  `).join("");
}

function renderTeacherSubmission() {
  if (!els.teacherSubmission) return;

  els.teacherSubmission.hidden = !state.started;
  if (!state.started) return;

  const summary = getTotalScoreSummary();
  els.submissionScoreSummary.textContent = `Total: ${summary.totalScore} / ${summary.totalMax} (${summary.percentage}%)`;
  els.teacherSubmissionIdentity.textContent = `Submitting as: ${state.selectedStudentName} (${state.selectedClassName})`;
  els.submissionStatus.textContent = state.submissionStatus;
  els.submissionStatus.className = state.submissionStatus ? "submission-status visible" : "submission-status";
}

function buildTeacherSubmissionPayload() {
  const summary = getTotalScoreSummary();
  const mistakes = getMistakeQuestions().map(question => question.id);
  const mcqAnswers = getMultipleChoiceQuestions().map(question => ({
    id: question.id,
    selectedAnswer: state.answers[question.id] || "",
    correctAnswer: question.correctAnswer,
    isSubmitted: Boolean(state.submitted[question.id]),
    isCorrect: Boolean(state.submitted[question.id]) && state.answers[question.id] === question.correctAnswer,
    marks: question.marks || 0,
    awardedMarks: Boolean(state.submitted[question.id]) && state.answers[question.id] === question.correctAnswer ? question.marks || 0 : 0
  }));

  const longAnswerSelfAssessment = getStructuredQuestions().map(question => ({
    id: question.id,
    selfScore: calculateQuestionSelfScore(question),
    maxMarks: question.marks || 0,
    subparts: (question.subparts || []).map(subpart => ({
      id: subpart.id,
      selfScore: calculateSubpartSelfScore(question.id, subpart),
      maxMarks: subpart.marks || 0,
      checkedMarkPoints: (subpart.markSchemePoints || [])
        .map((_point, index) => state.selfAssessment[selfAssessmentKey(question.id, subpart.id, index)] ? index + 1 : null)
        .filter(Boolean),
      checkedCount: countCheckedMarkPoints(question.id, subpart),
      markPointCount: (subpart.markSchemePoints || []).length
    }))
  }));

  return {
    homeworkId: HOMEWORK_ID,
    studentName: state.selectedStudentName,
    className: state.selectedClassName,
    mcqScore: summary.mcqScore,
    mcqMax: summary.mcqMax,
    q10SelfScore: summary.q10Score,
    q10Max: summary.q10Max,
    q11SelfScore: summary.q11Score,
    q11Max: summary.q11Max,
    totalScore: summary.totalScore,
    totalMax: summary.totalMax,
    percentage: summary.percentage,
    mistakeQuestions: mistakes,
    mcqAnswers,
    longAnswerSelfAssessment,
    attemptId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  };
}

async function submitToTeacher(event) {
  event.preventDefault();

  const payload = buildTeacherSubmissionPayload();
  if (!payload.studentName || !payload.className) {
    state.submissionStatus = "Choose your class and name before submitting.";
    renderTeacherSubmission();
    return;
  }

  if (!TEACHER_SUBMISSION_ENDPOINT) {
    state.submissionStatus = "Teacher submission is not connected yet. Paste your Google Apps Script Web App URL into TEACHER_SUBMISSION_ENDPOINT in script.js.";
    renderTeacherSubmission();
    return;
  }

  els.teacherSubmit.disabled = true;
  state.submissionStatus = "Submitting...";
  renderTeacherSubmission();

  try {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    };

    if (TEACHER_SUBMISSION_MODE === "no-cors") {
      options.mode = "no-cors";
    }

    const response = await fetch(TEACHER_SUBMISSION_ENDPOINT, options);
    if (TEACHER_SUBMISSION_MODE !== "no-cors" && !response.ok) {
      throw new Error(`Submission failed with status ${response.status}`);
    }

    state.submissionStatus = "Submitted. Your teacher's Google Sheet should now receive this result.";
  } catch (error) {
    state.submissionStatus = "Submission failed, please try again.";
  } finally {
    els.teacherSubmit.disabled = false;
    renderTeacherSubmission();
  }
}

function getCurrentQuestion() {
  return state.questions[state.currentIndex];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRichText(container, text, media = []) {
  const parts = String(text || "").split(/(\[diagram needed\]|\[formula missing from source extraction\])/g);
  let mediaIndex = 0;
  let html = "<div>";

  parts.forEach(part => {
    if (!part) return;
    const isPlaceholder = part === "[diagram needed]" || part === "[formula missing from source extraction]";
    if (!isPlaceholder) {
      html += formatInlineText(part).replace(/\n/g, "<br>");
      return;
    }

    const item = media[mediaIndex];
    mediaIndex += 1;
    if (!item) return;

    if (part === "[diagram needed]" || item.kind === "diagram") {
      html += `</div>${renderMediaHtml([item], "question-media")}<div>`;
    } else {
      html += renderInlineFormulaHtml(item);
    }
  });

  html += "</div>";

  if (mediaIndex < media.length) {
    html += renderMediaHtml(media.slice(mediaIndex), "question-media");
  }
  container.innerHTML = html;
}

function cleanExtractedPlaceholders(text) {
  return String(text || "")
    .replace(/\n?\[diagram needed\]\n?/g, "\n")
    .replace(/\[formula missing from source extraction\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatInlineText(text) {
  return escapeHtml(text)
    .replace(/Ealpha/g, "E<sub>α</sub>")
    .replace(/ms–1/g, "m s<sup>−1</sup>")
    .replace(/m s–1/g, "m s<sup>−1</sup>")
    .replace(/m s−1/g, "m s<sup>−1</sup>")
    .replace(/m s-1/g, "m s<sup>−1</sup>")
    .replace(/10–12/g, "10<sup>−12</sup>")
    .replace(/10–19/g, "10<sup>−19</sup>")
    .replace(/10–27/g, "10<sup>−27</sup>")
    .replace(/10\u221212/g, "10<sup>−12</sup>")
    .replace(/10\u221227/g, "10<sup>−27</sup>")
    .replace(/V2/g, "V<sup>2</sup>")
    .replace(/v2/g, "v<sup>2</sup>")
    .replace(/mv2/g, "mv<sup>2</sup>");
}

function createMediaStrip(mediaItems, className) {
  const strip = document.createElement("div");
  strip.className = className;
  mediaItems.forEach(item => {
    const figure = document.createElement("figure");
    figure.className = `media-item ${item.kind === "formula" ? "formula-item" : "diagram-item"}`;
    if (item.label || item.caption) {
      const captionTop = document.createElement("figcaption");
      captionTop.textContent = item.label || item.caption;
      figure.appendChild(captionTop);
    }
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.alt || "";
    img.loading = "lazy";
    figure.appendChild(img);
    strip.appendChild(figure);
  });
  return strip;
}

function renderMediaHtml(mediaItems, className) {
  if (!mediaItems.length) return "";
  return `
    <div class="${className}">
      ${mediaItems.map(item => `
        <figure class="media-item ${item.kind === "formula" ? "formula-item" : "diagram-item"}">
          ${item.label || item.caption ? `<figcaption>${escapeHtml(item.label || item.caption)}</figcaption>` : ""}
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || "")}" loading="lazy">
        </figure>
      `).join("")}
    </div>
  `;
}

function renderInlineFormulaHtml(item) {
  return `<span class="inline-formula"><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || "")}" loading="lazy"></span>`;
}

if (els.prev) els.prev.addEventListener("click", () => goTo(-1));
if (els.next) els.next.addEventListener("click", () => goTo(1));
if (els.submit) els.submit.addEventListener("click", submitCurrent);
els.teacherSubmissionForm.addEventListener("submit", submitToTeacher);
els.classSelect.addEventListener("change", updateStudentSelect);
els.startForm.addEventListener("submit", startQuiz);

init();
