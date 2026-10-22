/* Beyond the Wild — robust interactions.
   The page content remains visible even if this script fails to load. */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Scroll progress bar
  const progressBar = $("#progressBar");
  const updateProgress = () => {
    if (!progressBar) return;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  // Mobile navigation
  const menuToggle = $("#menuToggle");
  const navLinks = $("#navLinks");
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.textContent = open ? "✕" : "☰";
    });
    $$("a", navLinks).forEach(link => link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.textContent = "☰";
    }));
  }

  // Scroll reveal. If IntersectionObserver is unavailable, all content is still visible.
  const revealItems = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    revealItems.forEach(item => revealObserver.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add("visible"));
  }

  // Image pop-up / lightbox for large background images.
  const lightbox = document.createElement("div");
  lightbox.className = "image-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Image preview");
  lightbox.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Close image preview">×</button>
    <div class="lightbox-inner">
      <img alt="Expanded conservation photograph">
      <div class="lightbox-caption"></div>
    </div>`;
  document.body.appendChild(lightbox);

  const lightboxImg = $("img", lightbox);
  const lightboxCaption = $(".lightbox-caption", lightbox);
  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    lightboxImg.removeAttribute("src");
  };
  const openLightbox = (src, caption) => {
    if (!src) return;
    lightboxImg.src = src;
    lightboxImg.alt = caption || "Conservation photograph";
    lightboxCaption.textContent = caption || "Beyond the Wild · Ex-situ conservation";
    lightbox.classList.add("is-open");
    document.body.classList.add("lightbox-open");
    $(".lightbox-close", lightbox).focus();
  };
  $(".lightbox-close", lightbox).addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", event => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeLightbox();
  });

  const imageTargets = [
    { selector: ".hero-backdrop", caption: "Healthy forests are essential to biodiversity" },
    { selector: ".case-image", caption: "Vulture conservation in India" },
    { selector: ".mini-case-visual.red-panda-visual", caption: "Red panda conservation" },
    { selector: ".mini-case-visual.pangolin-visual", caption: "Indian pangolin conservation" }
  ];
  imageTargets.forEach(({ selector, caption }) => {
    $$(selector).forEach(element => {
      element.setAttribute("role", "button");
      element.setAttribute("tabindex", "0");
      element.setAttribute("aria-label", `Open image preview: ${caption}`);
      const activate = () => {
        const background = getComputedStyle(element).backgroundImage;
        const match = background.match(/url\(["']?(.*?)["']?\)/);
        if (match && match[1] && match[1] !== "none") {
          openLightbox(match[1], caption);
        } else {
          openLightbox("", caption);
        }
      };
      element.addEventListener("click", activate);
      element.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    });
  });

  // Quiz
  const quiz = [
    {
      question: "What does ex-situ conservation mean?",
      options: ["Protecting species only in national parks", "Conserving species outside their natural habitat", "Removing every pollutant from a river", "Studying only extinct species"],
      answer: 1,
      explanation: "Ex-situ conservation takes place outside a species' natural habitat, for example in a conservation breeding centre or seed bank."
    },
    {
      question: "Which is an example of pollution affecting a food chain?",
      options: ["A clean nesting site", "A wildlife corridor", "A scavenger exposed to a harmful veterinary drug in a carcass", "A seed stored safely"],
      answer: 2,
      explanation: "Harmful substances can reach wildlife through contaminated food. India's vulture crisis is a well-known example involving veterinary diclofenac."
    },
    {
      question: "Which Indian location is associated with a vulture conservation and breeding centre?",
      options: ["Pinjore, Haryana", "The Thar Desert only", "The Sundarbans only", "The Deccan Plateau only"],
      answer: 0,
      explanation: "The Vulture Conservation and Breeding Centre at Pinjore, Haryana, is an important part of India's vulture conservation work."
    },
    {
      question: "Why is ex-situ conservation not enough on its own?",
      options: ["It cannot involve scientific research", "It always harms every animal", "It does not automatically remove pollution or restore wild habitats", "It only applies to plants"],
      answer: 2,
      explanation: "Long-term success also requires pollution prevention, habitat protection and monitoring in the wild."
    },
    {
      question: "When should animals from a breeding programme be released?",
      options: ["As soon as they are born", "Only when a science-led plan says it is suitable and threats are addressed", "Whenever visitors request it", "Before checking habitat conditions"],
      answer: 1,
      explanation: "Release requires careful assessment of health, behaviour, habitat quality, threats and post-release monitoring."
    }
  ];

  const questionEl = $("#quizQuestion");
  const optionsEl = $("#quizOptions");
  const feedbackEl = $("#quizFeedback");
  const nextBtn = $("#nextQuestion");
  const countEl = $("#questionCount");
  const scoreEl = $("#scoreLabel");
  const quizProgress = $("#quizProgress");

  if (!questionEl || !optionsEl || !feedbackEl || !nextBtn || !countEl || !scoreEl || !quizProgress) return;

  let currentQuestion = 0;
  let score = 0;
  let selectedAnswer = null;
  let answerChecked = false;
  let finished = false;

  function renderQuestion() {
    const q = quiz[currentQuestion];
    selectedAnswer = null;
    answerChecked = false;
    finished = false;
    questionEl.textContent = q.question;
    optionsEl.innerHTML = "";
    feedbackEl.textContent = "";
    feedbackEl.style.color = "";
    countEl.textContent = `QUESTION ${currentQuestion + 1} OF ${quiz.length}`;
    scoreEl.textContent = `SCORE ${score}`;
    quizProgress.style.width = `${(currentQuestion / quiz.length) * 100}%`;

    q.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz-option";
      const letter = document.createElement("span");
      letter.className = "option-letter";
      letter.textContent = String.fromCharCode(65 + index);
      const label = document.createElement("span");
      label.textContent = option;
      button.append(letter, label);
      button.addEventListener("click", () => {
        if (answerChecked || finished) return;
        selectedAnswer = index;
        $$(".quiz-option", optionsEl).forEach(b => b.classList.remove("selected"));
        button.classList.add("selected");
        nextBtn.disabled = false;
        nextBtn.textContent = "Check answer →";
      });
      optionsEl.appendChild(button);
    });
    nextBtn.disabled = true;
    nextBtn.textContent = "Choose an answer →";
  }

  function checkAnswer() {
    const q = quiz[currentQuestion];
    answerChecked = true;
    $$(".quiz-option", optionsEl).forEach((button, index) => {
      button.disabled = true;
      if (index === q.answer) button.classList.add("correct");
      if (index === selectedAnswer && selectedAnswer !== q.answer) button.classList.add("wrong");
    });
    const correct = selectedAnswer === q.answer;
    if (correct) score++;
    scoreEl.textContent = `SCORE ${score}`;
    feedbackEl.style.color = correct ? "#527047" : "#a45e4a";
    feedbackEl.textContent = (correct ? "Correct! " : "Not quite. ") + q.explanation;
    quizProgress.style.width = `${((currentQuestion + 1) / quiz.length) * 100}%`;
    nextBtn.disabled = false;
    nextBtn.textContent = currentQuestion === quiz.length - 1 ? "See results ↗" : "Next question →";
  }

  function showResults() {
    finished = true;
    questionEl.textContent = `You scored ${score} out of ${quiz.length}!`;
    optionsEl.innerHTML = "";
    feedbackEl.style.color = "#527047";
    feedbackEl.textContent = score === quiz.length
      ? "Excellent work! You understand the link between pollution and conservation."
      : score >= 3
        ? "Good job! Review the case studies to strengthen your understanding."
        : "Nice effort! Revisit the learning sections and try again.";
    countEl.textContent = "QUIZ COMPLETE";
    scoreEl.textContent = `FINAL SCORE ${score}/${quiz.length}`;
    quizProgress.style.width = "100%";
    nextBtn.disabled = false;
    nextBtn.textContent = "Try again ↻";
  }

  nextBtn.addEventListener("click", () => {
    if (finished) {
      currentQuestion = 0;
      score = 0;
      renderQuestion();
    } else if (!answerChecked) {
      if (selectedAnswer !== null) checkAnswer();
    } else if (currentQuestion < quiz.length - 1) {
      currentQuestion++;
      renderQuestion();
    } else {
      showResults();
    }
  });

  renderQuestion();
})();