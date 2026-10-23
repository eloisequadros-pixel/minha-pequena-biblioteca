
// Minha Pequena Biblioteca — Diário de Leitura
// Os livros ficam salvos no localStorage deste navegador.

const STORAGE_KEY = "minhaPequenaBibliotecaLivros";

const form = document.querySelector("#book-form");
const dialog = document.querySelector("#book-dialog");
const bookGrid = document.querySelector("#book-grid");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search");
const sortSelect = document.querySelector("#sort");
const ratingPicker = document.querySelector("#rating-picker");
const ratingLabel = document.querySelector("#rating-label");
const toast = document.querySelector("#toast");

let books = loadBooks();
let selectedRating = 0;
let activeFilter = "todos";
let toastTimer;

function loadBooks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Não foi possível carregar os livros:", error);
    return [];
  }
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function makeId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 7);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function statusLabel(status) {
  return {
    lido: "Lido",
    lendo: "Lendo",
    quero: "Quero ler"
  }[status] || "Lido";
}

function starMarkup(rating) {
  let result = "";

  for (let number = 1; number <= 5; number++) {
    result += `<span class="${number <= rating ? "" : "empty-star"}">★</span>`;
  }

  return result;
}

function updateStats() {
  document.querySelector("#read-count").textContent =
    books.filter(book => book.status === "lido").length;

  document.querySelector("#reading-count").textContent =
    books.filter(book => book.status === "lendo").length;

  document.querySelector("#want-count").textContent =
    books.filter(book => book.status === "quero").length;

  document.querySelector("#quote-count").textContent =
    books.filter(book => book.quote && book.quote.trim()).length;
}

function renderBooks() {
  const searchTerm = searchInput.value
    .trim()
    .toLocaleLowerCase("pt-BR");

  let visibleBooks = books.filter(book => {
    const searchableText = `${book.title} ${book.author}`
      .toLocaleLowerCase("pt-BR");

    const matchesSearch = searchableText.includes(searchTerm);
    const matchesFilter =
      activeFilter === "todos" || book.status === activeFilter;

    return matchesSearch && matchesFilter;
  });

  if (sortSelect.value === "titulo") {
    visibleBooks.sort((a, b) =>
      a.title.localeCompare(b.title, "pt-BR")
    );
  } else if (sortSelect.value === "nota") {
    visibleBooks.sort((a, b) => b.rating - a.rating);
  } else {
    visibleBooks.sort((a, b) => b.createdAt - a.createdAt);
  }

  bookGrid.innerHTML = visibleBooks.map(book => {
    const cover = book.cover
      ? `<img src="${escapeHTML(book.cover)}"
          alt="Capa de ${escapeHTML(book.title)}"
          loading="lazy"
          onerror="this.style.display='none'">`
      : "";

    const initialCover =
      `<div class="cover-placeholder">${escapeHTML(book.title)}</div>`;

    const reviewText = book.review
      ? `<span class="book-note">✎ Resenha salva</span>`
      : `<span class="book-note">Sem resenha</span>`;

    return `
      <article class="book-card">
        <div class="cover-wrap">
          ${initialCover}
          ${cover}
          <span class="status-tag">${statusLabel(book.status)}</span>
        </div>

        <h3 class="book-title-card">${escapeHTML(book.title)}</h3>
        <p class="book-author">${escapeHTML(book.author)}</p>

        <div class="book-rating-line">
          <div class="stars" aria-label="${book.rating} de 5 estrelas">
            ${starMarkup(book.rating)}
          </div>
          <span class="book-note">
            ${book.rating ? `${book.rating}/5` : "—"}
          </span>
        </div>

        ${reviewText}

        <div class="card-actions">
          <button class="small-action"
            data-action="edit"
            data-id="${book.id}">
            Ver / editar
          </button>

          <button class="small-action"
            data-action="delete"
            data-id="${book.id}">
            Excluir
          </button>
        </div>
      </article>
    `;
  }).join("");

  const shouldShowEmpty = visibleBooks.length === 0;

  emptyState.classList.toggle("show", shouldShowEmpty);

  if (books.length > 0 && shouldShowEmpty) {
    emptyState.querySelector("h3").textContent =
      "Nenhum livro encontrado.";

    emptyState.querySelector("p").textContent =
      "Tente mudar a busca ou escolher outro filtro.";

    emptyState.querySelector("button").style.display = "none";
  } else if (books.length === 0) {
    emptyState.querySelector("h3").textContent =
      "Sua próxima história começa aqui.";

    emptyState.querySelector("p").textContent =
      "Adicione o primeiro livro e comece a construir sua biblioteca pessoal.";

    emptyState.querySelector("button").style.display = "inline-block";
  } else {
    emptyState.querySelector("button").style.display = "none";
  }

  updateStats();
  renderQuotes();
}

function renderQuotes() {
  const quoteArea = document.querySelector("#journal-quotes");

  const quotes = books
    .filter(book => book.quote && book.quote.trim())
    .slice()
    .reverse()
    .slice(0, 4);

  if (!quotes.length) {
    quoteArea.innerHTML = `
      <div class="quote-placeholder">
        <span>“</span>
        <p>
          Suas frases favoritas aparecerão aqui quando você
          as guardar nos detalhes de um livro.
        </p>
      </div>
    `;
    return;
  }

  quoteArea.innerHTML = quotes.map(book => `
    <article class="quote-card">
      <div class="quote-mark">“</div>

      <blockquote>${escapeHTML(book.quote)}</blockquote>

      <div class="quote-source">
        ${escapeHTML(book.title)} · ${escapeHTML(book.author)}
        ${book.page ? ` · pág. ${escapeHTML(book.page)}` : ""}
      </div>
    </article>
  `).join("");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function setRating(value) {
  selectedRating = value;

  [...ratingPicker.querySelectorAll("button")].forEach(button => {
    const rating = Number(button.dataset.rating);

    button.classList.toggle("selected", rating <= value);

    button.setAttribute(
      "aria-checked",
      rating === value ? "true" : "false"
    );
  });

  ratingLabel.textContent = value
    ? `${value} de 5 estrelas`
    : "Sem avaliação";
}

function openDialog(book = null) {
  form.reset();

  document.querySelector("#book-id").value =
    book ? book.id : "";

  document.querySelector("#dialog-title").textContent =
    book ? "Editar livro" : "Adicionar livro";

  document.querySelector("#title").value =
    book?.title || "";

  document.querySelector("#author").value =
    book?.author || "";

  document.querySelector("#cover").value =
    book?.cover || "";

  document.querySelector("#status").value =
    book?.status || "lido";

  document.querySelector("#review").value =
    book?.review || "";

  document.querySelector("#favorite-quote").value =
    book?.quote || "";

  document.querySelector("#quote-page").value =
    book?.page || "";

  setRating(book?.rating || 0);

  dialog.showModal();
  document.querySelector("#title").focus();
}

function closeDialog() {
  dialog.close();
}

document.querySelectorAll(
  "#open-add, #open-add-top, #empty-add"
).forEach(button => {
  button.addEventListener("click", () => openDialog());
});

document.querySelector("#close-dialog")
  .addEventListener("click", closeDialog);

document.querySelector("#cancel-dialog")
  .addEventListener("click", closeDialog);

ratingPicker.querySelectorAll("button").forEach(button => {
  button.addEventListener("click", () => {
    setRating(Number(button.dataset.rating));
  });
});

form.addEventListener("submit", event => {
  event.preventDefault();

  const existingId = document.querySelector("#book-id").value;
  const previous = books.find(book => book.id === existingId);

  const book = {
    id: existingId || makeId(),

    title: document.querySelector("#title").value.trim(),
    author: document.querySelector("#author").value.trim(),
    cover: document.querySelector("#cover").value.trim(),
    status: document.querySelector("#status").value,
    rating: selectedRating,
    review: document.querySelector("#review").value.trim(),

    quote: document.querySelector("#favorite-quote").value.trim(),
    page: document.querySelector("#quote-page").value.trim(),

    createdAt: previous?.createdAt || Date.now()
  };

  if (!book.title || !book.author) {
    showToast("Preencha o título e o autor.");
    return;
  }

  if (previous) {
    books = books.map(item =>
      item.id === existingId ? book : item
    );
  } else {
    books.push(book);
  }

  saveBooks();
  renderBooks();
  closeDialog();

  showToast(
    previous
      ? "Livro atualizado no seu diário."
      : "Livro guardado na sua biblioteca."
  );
});

bookGrid.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const book = books.find(item => item.id === button.dataset.id);

  if (!book) return;

  if (button.dataset.action === "edit") {
    openDialog(book);
  } else if (button.dataset.action === "delete") {
    const confirmed = confirm(
      `Tem certeza de que deseja excluir "${book.title}" do seu diário?`
    );

    if (confirmed) {
      books = books.filter(item => item.id !== book.id);

      saveBooks();
      renderBooks();
      showToast("Livro removido.");
    }
  }
});

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    document.querySelectorAll(".filter").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderBooks();
  });
});

searchInput.addEventListener("input", renderBooks);
sortSelect.addEventListener("change", renderBooks);

// Mostra os livros salvos ao abrir a página.
renderBooks();