const grid = document.getElementById("grid");
const addRowButton = document.getElementById("add-row");


// Cria uma linha com 5 células
function addRow() {
  for (let i = 0; i < 5; i++) {
    const cell = document.createElement("div");

    cell.className = "cell";

    // Permite escrever dentro da célula
    cell.contentEditable = "true";

    // Evita que o Enter crie uma nova linha dentro da célula
    cell.addEventListener("keydown", function(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        cell.blur();
      }
    });

    grid.appendChild(cell);
  }
}


// Criar as 20 linhas iniciais
for (let i = 0; i < 20; i++) {
  addRow();
}


// O + adiciona uma nova linha
addRowButton.addEventListener("click", addRow);
