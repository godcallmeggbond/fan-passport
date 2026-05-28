import "dotenv/config";
import fs from "node:fs/promises";
import solc from "solc";
import { ethers } from "ethers";

const chainId = Number(process.env.XLAYER_CHAIN_ID || "196");
const rpcUrl = process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech";
const explorerBase = "https://www.okx.com/web3/explorer/xlayer/address";

async function compileContract() {
  const sourcePath = "contracts/XCupFanPassport.sol";
  const source = await fs.readFile(sourcePath, "utf8");
  const input = {
    language: "Solidity",
    sources: {
      [sourcePath]: { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors || [];
  const fatal = errors.filter((error) => error.severity === "error");
  for (const error of errors) {
    const label = error.severity === "error" ? "ERROR" : "WARN";
    console.error(`[${label}] ${error.formattedMessage}`);
  }
  if (fatal.length) throw new Error("Solidity compile failed.");

  const artifact = output.contracts?.[sourcePath]?.XCupFanPassport;
  if (!artifact?.abi || !artifact?.evm?.bytecode?.object) {
    throw new Error("Missing compiled artifact.");
  }

  return {
    abi: artifact.abi,
    bytecode: `0x${artifact.evm.bytecode.object}`,
  };
}

async function main() {
  const artifact = await compileContract();
  console.log("XCupFanPassport: compile ok");

  if (process.argv.includes("--compile-only")) return;

  if (!process.env.DEPLOYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY.includes("REPLACE")) {
    throw new Error("Set DEPLOYER_PRIVATE_KEY in .env before deploying.");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} OKB`);

  if (balance === 0n) {
    throw new Error("Deployer wallet has no OKB for gas on the selected X Layer network.");
  }

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  const deployTx = contract.deploymentTransaction();
  console.log(`Deployment tx: ${deployTx.hash}`);

  await contract.waitForDeployment();
  const receipt = await deployTx.wait();
  const address = await contract.getAddress();

  const deployment = {
    project: "XCupFanPassport",
    address,
    chainId,
    rpcUrl,
    explorer: `${explorerBase}/${address}`,
    transactionHash: deployTx.hash,
    blockNumber: receipt?.blockNumber || null,
    gasUsed: receipt?.gasUsed?.toString() || null,
    deployedAt: new Date().toISOString(),
  };

  await fs.writeFile("deployment.json", `${JSON.stringify(deployment, null, 2)}\n`, "utf8");
  console.log(`Deployed at ${address}`);
  console.log("Wrote deployment.json");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
