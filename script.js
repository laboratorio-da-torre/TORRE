const grid = document.getElementById("grid");
const addRowButton = document.getElementById("add-row");


// =========================
// DADOS
// =========================

let savedData =
  JSON.parse(localStorage.getItem("torreData")) || [];


// =========================
// FULLSCREEN
// =========================

const viewer = document.createElement("div");

viewer.id = "image-viewer";

viewer.innerHTML = `
  <img src="" alt="">
`;

document.body.appendChild(viewer);

const viewerImage = viewer.querySelector("img");


viewer.addEventListener("click", function () {
  viewer.style.display = "none";
  viewerImage.src = "";
});


// =========================
// CRIAR CÉLULA
// =========================

function createCell(index) {

  const cell = document.createElement("div");

  cell.className = "cell";


  // PRIMEIRA COLUNA = IMAGEM

  if (index % 6 === 0) {

    cell.classList.add("image-cell");

    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/*";

    input.style.display = "none";


    // clicar na célula abre seleção

    cell.addEventListener("click", function () {

      if (!cell.querySelector("img")) {
        input.click();
      }

    });


    // escolher imagem

    input.addEventListener("change", function () {

      const file = input.files[0];

      if (!file) return;


      const reader = new FileReader();


      reader.onload = function (event) {

        const image = document.createElement("img");

        image.src = event.target.result;

        cell.innerHTML = "";

        cell.appendChild(image);


        // clicar na imagem = fullscreen

        image.addEventListener("click", function (event) {

          event.stopPropagation();

          viewerImage.src = image.src;

          viewer.style.display = "flex";

        });


        // guardar imagem

        savedData[index] = event.target.result;

        localStorage.setItem(
          "torreData",
          JSON.stringify(savedData)
        );

      };


      reader.readAsDataURL(file);

    });


    cell.appendChild(input);


    // recuperar imagem

    if (savedData[index]) {

      const image = document.createElement("img");

      image.src = savedData[index];

      cell.innerHTML = "";

      cell.appendChild(image);


      image.addEventListener("click", function (event) {

        event.stopPropagation();

        viewerImage.src = image.src;

        viewer.style.display = "flex";

      });

    }


    return cell;
  }


  // =========================
  // RESTO DAS CÉLULAS
  // =========================

  cell.contentEditable = "true";


  if (savedData[index]) {
    cell.textContent = savedData[index];
  }


  cell.addEventListener("input", function () {

    savedData[index] = cell.textContent;

    localStorage.setItem(
      "torreData",
      JSON.stringify(savedData)
    );

  });


  cell.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {

      event.preventDefault();

      cell.blur();

    }

  });


  return cell;
}


// =========================
// CRIAR LINHA
// =========================

function addRow() {

  const currentCells = grid.children.length;


  for (let i = 0; i < 6; i++) {

    const index = currentCells + i;

    const cell = createCell(index);

    grid.appendChild(cell);

  }

}


// =========================
// 20 LINHAS INICIAIS
// =========================

if (grid.children.length === 0) {

  for (let i = 0; i < 20; i++) {

    addRow();

  }

}


// =========================
// +
// =========================

addRowButton.addEventListener(
  "click",
  addRow
);
