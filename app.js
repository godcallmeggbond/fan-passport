const XLAYER_MAINNET = {
  chainId: "0xc4",
  chainName: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: ["https://rpc.xlayer.tech"],
  blockExplorerUrls: ["https://www.okx.com/web3/explorer/xlayer"],
};

const CONTRACT_ABI = [
  "function mintPassport(uint8 teamId)",
  "function checkIn()",
  "function completeQuest(uint8 questType)",
  "function getPassport(address fan) view returns (uint256 tokenId,uint8 teamId,uint32 level,uint256 xp,uint64 mintedAt,uint64 lastCheckIn,uint256 badges)",
  "function passportOf(address fan) view returns (uint256)",
  "function questCompleted(uint256 tokenId,uint8 questType) view returns (bool)",
  "event PassportMinted(address indexed fan,uint256 indexed tokenId,uint8 teamId)",
  "event CheckedIn(address indexed fan,uint256 indexed tokenId,uint256 xp)",
  "event QuestCompleted(address indexed fan,uint256 indexed tokenId,uint8 questType,uint256 xp)",
];

const TEAMS = [
  { id: 1, name: "Brazil", accent: "#1f9d55" },
  { id: 2, name: "Argentina", accent: "#3a9fc4" },
  { id: 3, name: "France", accent: "#3b5bbf" },
  { id: 4, name: "Germany", accent: "#222222" },
  { id: 5, name: "Spain", accent: "#c74343" },
  { id: 6, name: "England", accent: "#a23c47" },
  { id: 7, name: "Japan", accent: "#d8485c" },
  { id: 8, name: "Morocco", accent: "#0b8d61" },
];

const QUESTS = [
  { id: 1, title: "Match call mark", text: "Record that this holder made a call before kickoff." },
  { id: 2, title: "Public shout", text: "Share the fan ID booth or your chosen side on X." },
  { id: 3, title: "Seat saved", text: "Bring another wallet into the holder list." },
  { id: 4, title: "Second visit", text: "Return later in the tournament and add another proof mark." },
];

const BADGES = [
  { bit: 0, title: "Issued", text: "Fan ID opened" },
  { bit: 1, title: "Checked In", text: "Match-day mark" },
  { bit: 2, title: "Called It", text: "Match call saved" },
  { bit: 3, title: "Posted", text: "Shared on X" },
  { bit: 4, title: "Plus One", text: "Brought a holder" },
  { bit: 5, title: "Returned", text: "Came back again" },
];

const state = {
  account: "",
  chainId: "",
  contractAddress: localStorage.getItem("fanPassportAddress") || "",
  selectedTeamId: Number(localStorage.getItem("fanPassportSelectedTeam") || "1"),
  passport: JSON.parse(localStorage.getItem("fanPassportState") || "null") || null,
  quests: JSON.parse(localStorage.getItem("fanPassportQuests") || "{}"),
  log: JSON.parse(localStorage.getItem("fanPassportLog") || "[]"),
};

const els = {
  connectButton: document.querySelector("#connectButton"),
  switchNetworkButton: document.querySelector("#switchNetworkButton"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  contractAddressInput: document.querySelector("#contractAddressInput"),
  clearSettingsButton: document.querySelector("#clearSettingsButton"),
  saveSettingsButton: document.querySelector("#saveSettingsButton"),
  networkBadge: document.querySelector("#networkBadge"),
  teamGrid: document.querySelector("#teamGrid"),
  mintButton: document.querySelector("#mintButton"),
  checkInButton: document.querySelector("#checkInButton"),
  questList: document.querySelector("#questList"),
  badgeShelf: document.querySelector("#badgeShelf"),
  leaderboard: document.querySelector("#leaderboard"),
  activityLog: document.querySelector("#activityLog"),
  passportOwner: document.querySelector("#passportOwner"),
  levelValue: document.querySelector("#levelValue"),
  xpValue: document.querySelector("#xpValue"),
  badgeValue: document.querySelector("#badgeValue"),
  selectedTeam: document.querySelector("#selectedTeam"),
};

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected";
}

function selectedTeam() {
  return TEAMS.find((team) => team.id === state.selectedTeamId) || TEAMS[0];
}

function countBadges(bits) {
  return BADGES.filter((badge) => (Number(bits) & (1 << badge.bit)) !== 0).length;
}

function saveLocalState() {
  localStorage.setItem("fanPassportSelectedTeam", String(state.selectedTeamId));
  localStorage.setItem("fanPassportState", JSON.stringify(state.passport));
  localStorage.setItem("fanPassportQuests", JSON.stringify(state.quests));
  localStorage.setItem("fanPassportLog", JSON.stringify(state.log.slice(0, 20)));
}

function addLog(message) {
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  state.log.unshift(`${now} - ${message}`);
  state.log = state.log.slice(0, 20);
  saveLocalState();
  render();
}

function ensureLocalPassport() {
  if (state.passport) return state.passport;
  const team = selectedTeam();
  state.passport = {
    tokenId: Math.floor(1000 + Math.random() * 9000),
    teamId: team.id,
    level: 1,
    xp: 100,
    badges: 1,
    mintedAt: Date.now(),
    lastCheckIn: 0,
  };
  saveLocalState();
  return state.passport;
}

function renderTeams() {
  els.teamGrid.innerHTML = TEAMS.map((team) => `
    <button class="team-button ${state.selectedTeamId === team.id ? "selected" : ""}" data-team="${team.id}" type="button">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${team.accent};margin-right:8px"></span>
      ${team.name}
    </button>
  `).join("");

  document.querySelectorAll(".team-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.passport) {
        addLog("Side stamp is sealed after passport issue.");
        return;
      }
      state.selectedTeamId = Number(button.dataset.team);
      saveLocalState();
      render();
    });
  });
}

function renderPassport() {
  const passport = state.passport;
  const team = passport ? TEAMS.find((item) => item.id === passport.teamId) : selectedTeam();
  const chainReady = state.chainId === XLAYER_MAINNET.chainId;
  const mode = state.contractAddress ? "contract" : "demo";

  els.networkBadge.textContent = chainReady ? `X Layer mainnet / ${mode}` : "Switch network";
  els.connectButton.textContent = state.account ? shortAddress(state.account) : "Connect wallet";
  els.passportOwner.textContent = passport
    ? `Fan ID #${passport.tokenId} belongs to ${state.account ? shortAddress(state.account) : "this holder"}.`
    : "Connect a wallet to issue a fan ID.";
  els.levelValue.textContent = passport ? String(passport.level) : "0";
  els.xpValue.textContent = passport ? String(passport.xp) : "0";
  els.badgeValue.textContent = passport ? String(countBadges(passport.badges)) : "0";
  els.selectedTeam.textContent = passport ? `Side locked: ${team.name}` : `Selected side: ${team.name}`;
  els.mintButton.textContent = passport ? "Fan ID issued" : "Issue Fan ID";
  els.mintButton.disabled = Boolean(passport);
}

function renderQuests() {
  els.questList.innerHTML = QUESTS.map((quest) => {
    const done = Boolean(state.quests[quest.id]);
    return `
      <article class="quest-card">
        <h3>${quest.title}</h3>
        <p>${quest.text}</p>
        <button class="quest-button ${done ? "done" : ""}" data-quest="${quest.id}" type="button">${done ? "Marked" : "Add mark"}</button>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".quest-button").forEach((button) => {
    button.addEventListener("click", () => completeQuest(Number(button.dataset.quest)));
  });
}

function renderBadges() {
  const bits = state.passport ? Number(state.passport.badges) : 0;
  els.badgeShelf.innerHTML = BADGES.map((badge) => {
    const unlocked = (bits & (1 << badge.bit)) !== 0;
    return `
      <div class="badge-card ${unlocked ? "unlocked" : ""}">
        <strong>${badge.title}</strong>
        <span class="muted">${unlocked ? badge.text : "Locked"}</span>
      </div>
    `;
  }).join("");
}

function renderLeaderboard() {
  const fanName = state.account ? shortAddress(state.account) : "You";
  const xp = state.passport ? state.passport.xp : 0;
  const rows = [
    { name: fanName, xp, level: state.passport ? state.passport.level : 0 },
    { name: "0xA91E...7c21", xp: 270, level: 2 },
    { name: "0x77A0...55ff", xp: 230, level: 2 },
    { name: "0x1C44...8a90", xp: 180, level: 1 },
  ].sort((a, b) => b.xp - a.xp);

  els.leaderboard.innerHTML = rows.map((row) => `<li><strong>${row.name}</strong><br><span class="muted">${row.xp} XP / level ${row.level}</span></li>`).join("");
}

function renderLog() {
  const entries = state.log.length ? state.log : ["Fan ID booth is open. Connect a wallet to write activity on X Layer."];
  els.activityLog.innerHTML = entries.map((entry) => `<div class="log-entry">${entry}</div>`).join("");
}

function render() {
  renderTeams();
  renderPassport();
  renderQuests();
  renderBadges();
  renderLeaderboard();
  renderLog();
  els.contractAddressInput.value = state.contractAddress;
}

async function loadDeploymentConfig() {
  if (state.contractAddress) return;

  try {
    const response = await fetch("./deployment.json", { cache: "no-store" });
    if (!response.ok) return;

    const deployment = await response.json();
    if (deployment.address) {
      state.contractAddress = deployment.address;
      localStorage.setItem("fanPassportAddress", deployment.address);
      addLog(`Loaded X Layer contract: ${shortAddress(deployment.address)}.`);
      await refreshPassportFromChain();
      render();
    }
  } catch {
    // deployment.json is optional for local demo mode.
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    addLog("No injected wallet found. Install OKX Wallet or MetaMask.");
    return;
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  state.account = accounts[0] || "";
  state.chainId = await window.ethereum.request({ method: "eth_chainId" });
  addLog(`Wallet connected: ${shortAddress(state.account)}`);
  await refreshPassportFromChain();
  render();
}

async function switchToXLayer() {
  if (!window.ethereum) {
    addLog("No wallet available for network switch.");
    return;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: XLAYER_MAINNET.chainId }],
    });
  } catch (error) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [XLAYER_MAINNET],
      });
    } else {
      throw error;
    }
  }

  state.chainId = await window.ethereum.request({ method: "eth_chainId" });
  addLog("Switched to X Layer mainnet.");
}

async function getContract() {
  if (!state.contractAddress) return null;
  if (!window.ethereum || !window.ethers) return null;

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(state.contractAddress, CONTRACT_ABI, signer);
}

async function refreshPassportFromChain() {
  if (!state.account || !state.contractAddress || !window.ethereum || !window.ethers) return;
  try {
    const contract = await getContract();
    const result = await contract.getPassport(state.account);
    if (Number(result[0]) > 0) {
      const tokenId = Number(result[0]);
      state.passport = {
        tokenId,
        teamId: Number(result[1]),
        level: Number(result[2]),
        xp: Number(result[3]),
        mintedAt: Number(result[4]),
        lastCheckIn: Number(result[5]),
        badges: Number(result[6]),
      };
      for (const quest of QUESTS) {
        state.quests[quest.id] = await contract.questCompleted(BigInt(tokenId), quest.id);
      }
      saveLocalState();
    }
  } catch (error) {
    addLog(error.shortMessage || "Could not read passport contract.");
  }
}

async function prepareWallet() {
  if (!state.account) {
    await connectWallet();
    if (!state.account) return false;
  }
  if (state.chainId !== XLAYER_MAINNET.chainId) {
    await switchToXLayer();
  }
  return true;
}

async function mintPassport() {
  if (state.passport) return;
  const ready = await prepareWallet();
  if (!ready) return;

  const contract = await getContract();
  if (contract) {
    try {
      const tx = await contract.mintPassport(state.selectedTeamId);
      addLog(`Mint transaction sent: ${tx.hash.slice(0, 10)}...`);
      await tx.wait();
      await refreshPassportFromChain();
      addLog("Fan ID issued on X Layer.");
      return;
    } catch (error) {
      addLog(error.shortMessage || error.message || "Mint failed.");
      return;
    }
  }

  ensureLocalPassport();
  addLog(`Local fan ID issued for ${selectedTeam().name}.`);
  render();
}

async function checkIn() {
  const ready = await prepareWallet();
  if (!ready) return;

  const contract = await getContract();
  if (contract) {
    try {
      const tx = await contract.checkIn();
      addLog(`Stamp transaction sent: ${tx.hash.slice(0, 10)}...`);
      await tx.wait();
      await refreshPassportFromChain();
      addLog("Match-day mark confirmed on X Layer.");
      return;
    } catch (error) {
      addLog(error.shortMessage || error.message || "Stamp failed.");
      return;
    }
  }

  const passport = ensureLocalPassport();
  passport.xp += 20;
  passport.level = Math.max(1, Math.floor(passport.xp / 100));
  passport.badges = passport.badges | (1 << 1);
  passport.lastCheckIn = Date.now();
  saveLocalState();
  addLog("Local match-day mark added.");
}

async function completeQuest(questId) {
  if (state.quests[questId]) {
    addLog("This mark is already recorded.");
    return;
  }

  const ready = await prepareWallet();
  if (!ready) return;

  const contract = await getContract();
  if (contract) {
    try {
      const tx = await contract.completeQuest(questId);
      addLog(`Mark transaction sent: ${tx.hash.slice(0, 10)}...`);
      await tx.wait();
      state.quests[questId] = true;
      await refreshPassportFromChain();
      addLog("Fan mark confirmed on X Layer.");
      return;
    } catch (error) {
      addLog(error.shortMessage || error.message || "Fan mark failed.");
      return;
    }
  }

  const passport = ensureLocalPassport();
  state.quests[questId] = true;
  passport.xp += 30 + questId * 10;
  passport.level = Math.max(1, Math.floor(passport.xp / 100));
  passport.badges = passport.badges | (1 << (questId + 1));
  saveLocalState();
  addLog("Local fan mark added.");
}

function saveSettings() {
  const value = els.contractAddressInput.value.trim();
  state.contractAddress = value;
  if (value) {
    localStorage.setItem("fanPassportAddress", value);
    addLog("Fan ID contract saved.");
    refreshPassportFromChain();
  } else {
    localStorage.removeItem("fanPassportAddress");
    addLog("Contract cleared. Local preview enabled.");
  }
  els.settingsDialog.close();
  render();
}

function clearSettings() {
  els.contractAddressInput.value = "";
  saveSettings();
}

els.connectButton.addEventListener("click", connectWallet);
els.switchNetworkButton.addEventListener("click", switchToXLayer);
els.settingsButton.addEventListener("click", () => els.settingsDialog.showModal());
els.saveSettingsButton.addEventListener("click", saveSettings);
els.clearSettingsButton.addEventListener("click", clearSettings);
els.mintButton.addEventListener("click", mintPassport);
els.checkInButton.addEventListener("click", checkIn);

if (window.ethereum) {
  window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
    state.account = accounts[0] || "";
    return window.ethereum.request({ method: "eth_chainId" });
  }).then(async (chainId) => {
    state.chainId = chainId;
    await refreshPassportFromChain();
    render();
  }).catch(() => render());

  window.ethereum.on?.("accountsChanged", async (accounts) => {
    state.account = accounts[0] || "";
    await refreshPassportFromChain();
    render();
  });

  window.ethereum.on?.("chainChanged", async (chainId) => {
    state.chainId = chainId;
    await refreshPassportFromChain();
    render();
  });
}

render();
loadDeploymentConfig();
