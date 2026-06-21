const STUDENT_ID = "jesseN";
const SERVER_BASE_URL = "http://goldtop.hopto.org";
const STORAGE_KEY = "loopSplitterPhase4State";

let loot = [];
let partySize = 1;

let lootNameInput = document.getElementById("lootName");
let lootValueInput = document.getElementById("lootValue");
let quantityInput = document.getElementById("quantity");
let partySizeInput = document.getElementById("partySize");
let addLootButton = document.getElementById("addLootButton");
let splitLootButton = document.getElementById("splitLootButton");
let syncServerButton = document.getElementById("syncServerButton");
let loadServerButton = document.getElementById("loadServerButton");
let lootRows = document.getElementById("lootRows");
let noLootMessage = document.getElementById("noLootMessage");
let totalLoot = document.getElementById("totalLoot");
let lootPerMember = document.getElementById("lootPerMember");
let totalsPanel = document.getElementById("totalsPanel");
let resultsSection = document.getElementById("resultsSection");
let message = document.getElementById("message");

addLootButton.addEventListener("click", addLoot);
splitLootButton.addEventListener("click", splitLoot);
syncServerButton.addEventListener("click", syncToServer);
loadServerButton.addEventListener("click", loadFromServer);
partySizeInput.addEventListener("input", changePartySize);

function changePartySize() {
    let newPartySize = Number(partySizeInput.value);

    if (!isValidPartySize(newPartySize)) {
        message.innerText = "Please enter a valid party size of 1 or greater.";
        updateUI();
        return;
    }

    partySize = newPartySize;
    message.innerText = "";
    saveState();
    updateUI();
}

function addLoot() {
    let name = lootNameInput.value.trim();
    let value = Number(lootValueInput.value);
    let quantity = Number(quantityInput.value);

    if (!isValidLootItem({ name: name, value: value, quantity: quantity })) {
        message.innerText = "Please enter a loot name, a non-negative value, and a whole quantity of 1 or greater.";
        return;
    }

    let lootItem = {
        name: name,
        value: value,
        quantity: quantity
    };

    loot.push(lootItem);
    console.log("Debug addLoot lifecycle: mutate complete, saving local state before updateUI.");
    saveState();

    lootNameInput.value = "";
    lootValueInput.value = "";
    quantityInput.value = "";
    message.innerText = "Loot added and saved locally.";

    updateUI();
}

function removeLoot(index) {
    loot.splice(index, 1);
    console.log("Debug removeLoot lifecycle: state mutated, then saveState, then updateUI.");
    saveState();
    message.innerText = "Loot removed and saved locally.";
    updateUI();
}

function splitLoot() {
    updateUI();
    message.innerText = "Loot split calculated from current state.";
}

function saveState() {
    let localState = {
        loot: loot,
        partySize: partySize
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));
}

function loadState() {
    let savedState = localStorage.getItem(STORAGE_KEY);

    if (savedState === null) {
        updateUI();
        return;
    }

    try {
        let parsedState = JSON.parse(savedState);
        let verifiedState = verifyStateObject(parsedState);

        if (verifiedState === null) {
            message.innerText = "Saved local data was invalid. Current state was preserved.";
            updateUI();
            return;
        }

        loot = verifiedState.loot;
        partySize = verifiedState.partySize;
        partySizeInput.value = partySize;
        updateUI();
    } catch (error) {
        message.innerText = "Saved local data could not be loaded. Current state was preserved.";
        updateUI();
    }
}

function syncToServer() {
    let payload = {
        studentId: STUDENT_ID,
        state: {
            loot: loot,
            partySize: partySize
        }
    };

    fetch(SERVER_BASE_URL + "/save/" + STUDENT_ID, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(function (response) {
        if (!response.ok) {
            throw new Error("Server returned status " + response.status);
        }
        return response.json();
    })
    .then(function (data) {
        if (data.status === "saved" && data.studentId === STUDENT_ID) {
            message.innerText = "Success: state synced to server for " + STUDENT_ID + ".";
        } else {
            message.innerText = "Error: server sync response was not valid.";
        }
    })
    .catch(function (error) {
        message.innerText = "Error: state could not be synced to the server.";
        console.log("Debug syncToServer fetch failure:", error);
    });
}

function loadFromServer() {
    fetch(SERVER_BASE_URL + "/load/" + STUDENT_ID)
    .then(function (response) {
        if (!response.ok) {
            throw new Error("Server returned status " + response.status);
        }
        return response.json();
    })
    .then(function (data) {
        if (data.status === "empty" && data.studentId === STUDENT_ID) {
            message.innerText = "No server data found. Current state was preserved.";
            return;
        }

        if (data.status !== "loaded" || data.studentId !== STUDENT_ID) {
            message.innerText = "Error: server load response did not match the required contract.";
            return;
        }

        let verifiedState = verifyStateObject(data.state);

        if (verifiedState === null) {
            message.innerText = "Error: server data failed validation. Current state was preserved.";
            return;
        }

        console.log("Debug loadFromServer lifecycle: fetch and verification complete before assignment.");
        loot = verifiedState.loot;
        partySize = verifiedState.partySize;
        partySizeInput.value = partySize;
        saveState();
        updateUI();
        message.innerText = "Success: validated server state loaded and saved locally.";
    })
    .catch(function (error) {
        message.innerText = "Error: server data could not be loaded. Current state was preserved.";
        console.log("Debug loadFromServer fetch failure:", error);
    });
}

function verifyStateObject(stateObject) {
    if (typeof stateObject !== "object" || stateObject === null) {
        return null;
    }

    if (!Array.isArray(stateObject.loot)) {
        return null;
    }

    if (!isValidPartySize(Number(stateObject.partySize))) {
        return null;
    }

    let verifiedLoot = [];

    for (let i = 0; i < stateObject.loot.length; i++) {
        let currentItem = stateObject.loot[i];

        if (typeof currentItem !== "object" || currentItem === null) {
            return null;
        }

        let verifiedItem = {
            name: String(currentItem.name).trim(),
            value: Number(currentItem.value),
            quantity: Number(currentItem.quantity)
        };

        if (!isValidLootItem(verifiedItem)) {
            return null;
        }

        verifiedLoot.push(verifiedItem);
    }

    return {
        loot: verifiedLoot,
        partySize: Number(stateObject.partySize)
    };
}

function isValidLootItem(item) {
    return item.name !== "" &&
        !isNaN(item.value) &&
        item.value >= 0 &&
        !isNaN(item.quantity) &&
        item.quantity >= 1 &&
        Number.isInteger(item.quantity);
}

function isValidPartySize(size) {
    return !isNaN(size) && size >= 1 && Number.isInteger(size);
}

function updateUI() {
    let partyIsValid = isValidPartySize(partySize);
    let hasLoot = loot.length > 0;
    let total = 0;

    lootRows.innerHTML = "";
    partySizeInput.value = partySize;

    for (let i = 0; i < loot.length; i++) {
        total += loot[i].value * loot[i].quantity;
    }

    for (let i = 0; i < loot.length; i++) {
        let row = document.createElement("div");
        row.className = "loot-row";
        row.setAttribute("role", "row");

        let nameCell = document.createElement("div");
        nameCell.className = "loot-cell";
        nameCell.setAttribute("role", "cell");
        nameCell.innerText = loot[i].name;

        let valueCell = document.createElement("div");
        valueCell.className = "loot-cell";
        valueCell.setAttribute("role", "cell");
        valueCell.innerText = loot[i].value.toFixed(2);

        let quantityCell = document.createElement("div");
        quantityCell.className = "loot-cell";
        quantityCell.setAttribute("role", "cell");
        quantityCell.innerText = loot[i].quantity;

        let actionCell = document.createElement("div");
        actionCell.className = "loot-cell loot-actions";
        actionCell.setAttribute("role", "cell");

        let removeBtn = document.createElement("button");
        removeBtn.innerText = "Remove";
        removeBtn.type = "button";
        removeBtn.setAttribute("aria-label", "Remove " + loot[i].name);
        removeBtn.addEventListener("click", function () {
            removeLoot(i);
        });

        actionCell.appendChild(removeBtn);
        row.appendChild(nameCell);
        row.appendChild(valueCell);
        row.appendChild(quantityCell);
        row.appendChild(actionCell);
        lootRows.appendChild(row);
    }

    if (hasLoot) {
        noLootMessage.classList.add("hidden");
        totalsPanel.classList.remove("hidden");
    } else {
        noLootMessage.classList.remove("hidden");
        totalsPanel.classList.add("hidden");
    }

    if (hasLoot && partyIsValid) {
        splitLootButton.disabled = false;
        resultsSection.classList.remove("hidden");
        lootPerMember.innerText = (total / partySize).toFixed(2);
    } else {
        splitLootButton.disabled = true;
        resultsSection.classList.add("hidden");
        lootPerMember.innerText = "0.00";
    }

    totalLoot.innerText = total.toFixed(2);
}

loadState();
