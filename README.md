# WAGMI-ERC4337 Example

This is a simple frontend application that enables users to send ERC-4337 user operations using **wagmi**, **viem**, and **permissionless.js**.

- Create & Fund an ERC-4337 smart contract account.
- Send ERC-4337 user operations.

---

## Prerequisites

1. **Pimlico API Key**:
   - Obtain an API key by visiting the [Pimlico Documentation](https://docs.pimlico.io/).
   
2. **Environment File**:
   - After acquiring the API key, create a `.env.local` file in the root directory based on the provided `.env.example` file.
     
     Example:
     ```plaintext
     PIMLICO_API_KEY=your_api_key_here
     ```

3. **Install Dependencies**:
   - This project uses [**pnpm**](https://pnpm.io/installation) as the package manager. Make sure you have pnpm installed.
     

---

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/zt-9/wagmi-erc4337.git
   cd wagmi-erc4337
   ```

2. Install the dependencies:
   ```bash
   pnpm install
   ```

3. Set up the environment variables:
   - Create a `.env.local` file and include your Pimlico API key as described above.
   ```bash
   cp .env.example .env.local
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

---

## Usage

### Step 1: Fund Your Smart Contract Account
Before sending user operations, ensure your smart contract account is funded. Send ETH to your smart contract account address to cover transaction costs.

### Step 2: Send Your First User Operation
1. Access the frontend application by visiting the local development server (default: `http://localhost:3000`).
2. Use the provided UI to configure and send your first ERC-4337 user operation.

---

## Dependencies
- **[wagmi](https://wagmi.sh/)**: React hooks for Ethereum.
- **[viem](https://viem.sh/)**: Type-safe, lightweight, and fast library for interacting with Ethereum.
- **[permissionless.js](https://docs.pimlico.io/)**: Library for interacting with Pimlico's APIs.

---

## How It Works

### Step 1: Get Public and Private Clients

Use wagmi to get the viem public and wallet clients:
```js
import { usePublicClient, useWalletClient } from "wagmi";
const publicClient = usePublicClient();
const { data: walletClient } = useWalletClient();
```

### Step 2: Load the ERC4337 smart contract account
We use the `toSimpleSmartAccount` to load a simple erc4337 account.
This will not deploy a smart contract account if it does not exist. It simply loads the deterministic address where the smart account will be deployed.
```js
	import { toSimpleSmartAccount } from "permissionless/accounts";
	// ERC 4337 smart contract account
	const [smartAccount, setSmartAccount] = useState<any>(null);

	// Use an effect to load the smart account once walletClient is ready
	useEffect(() => {
		// If there's no wallet client yet, skip
		if (!walletClient) return;
		loadSmartAccount();
	}, [walletClient, publicClient]);

	async function loadSmartAccount() {
		try {
			const account = await toSimpleSmartAccount({
				client: publicClient,
				owner: walletClient!,
			});
			setSmartAccount(account);
		} catch (err) {
			console.error("Failed to get ERC4337 account:", err);
		}
	}
```

### Step 3: Create a Bundler Client

Create the bundler client with pimlico RPC
```js
import { createBundlerClient } from "viem/account-abstraction";
const bundlerClient = createBundlerClient({
  account: smartAccount,
  client: publicClient,
  transport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=APIKEY`),
});
```

### Step 4: Send a User Operation

Send a user operation to transfer ETH:
```js
const hash = await bundlerClient.sendUserOperation({
  account: smartAccount,
  calls: [
    {
      to: to,
      value: parseEther(value),
    },
  ],
});
```

This will send ETH to the specified to address `to`.



