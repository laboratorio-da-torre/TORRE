const grid = document.getElementById("grid");
const addRowButton = document.getElementById("add-row");


// Cria uma linha com 5 células
function addRow() {
  for (let i = 0; i < 5; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";

    grid.appendChild(cell);
  }
}


// Criar as 20 linhas iniciais
for (let i = 0; i < 20; i++) {
  addRow();
}


// O botão + adiciona uma nova linha
addRowButton.addEventListener("click", addRow);
