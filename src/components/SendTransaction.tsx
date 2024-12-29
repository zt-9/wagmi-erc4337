import { FormEvent, useState, useEffect, useRef } from "react";
import { type Hex, parseEther, http } from "viem";
import { type BaseError, useSendTransaction, useBalance, usePublicClient, useWalletClient } from "wagmi";
import { createBundlerClient, createPaymasterClient } from "viem/account-abstraction";
import { toSimpleSmartAccount } from "permissionless/accounts";

export function SendTransaction() {
  const { data: hash, error, isPending, sendTransaction } = useSendTransaction();

  // ERC 4337 smart contract account
  const [smartAccount, setSmartAccount] = useState<any>(null);
  const smartAccountBalance = useBalance({
    address: smartAccount?.address,
  });

  // state for tracking user operation status
  const [uoHash, setUOHash] = useState<`0x${string}`>("0x");
  const [uoStatus, setUoStatus] = useState<"" | "pending" | "success" | "failed">("");
  const [receipt, setReceipt] = useState<any>(null);
  const pollingRef = useRef<number | null>(null);

  // viem public client and  wallet client
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const paymasterClient = createPaymasterClient({
    transport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${import.meta.env.VITE_PIMLICO_API_KEY}`),
  });

  // create viem ERC4337 bundler client
  const bundlerClient = createBundlerClient({
    account: smartAccount,
    client: publicClient,
    paymaster: paymasterClient,
    transport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${import.meta.env.VITE_PIMLICO_API_KEY}`),
  });

  // Use an effect to load the smart account once walletClient is ready
  // @notice this will not deploy an smart contract account if the account does not exist
  useEffect(() => {
    // If there's no wallet client yet, skip
    if (!walletClient) return;
    // If intervalRef.current is not null, it means we already set up the interval
    if (pollingRef.current) return;

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

  // track user operation status
  useEffect(() => {
    if (uoHash === "0x") return;
    setUoStatus("pending");

    async function fetchReceipt() {
      try {
        const receipt = await bundlerClient.getUserOperationReceipt({ hash: uoHash });
        setReceipt(receipt);
        setUoStatus(receipt?.success ? "success" : "failed");
      } catch (err) {
        console.error("Failed to fetch receipt:", err);
      }
    }

    // don't fetch immediatelty. it takes time to send the uo to mempool
    // fetchReceipt();

    // Set up interval to fetch receipt every 5 seconds
    const intervalId = window.setInterval(fetchReceipt, 7_000);

    // Clean up interval on unmount or when result changes
    return () => {
      window.clearInterval(intervalId);
    };
  }, [uoHash]);

  async function fundSmartAccount(e: FormEvent<HTMLFormElement>) {
    if (!smartAccount) {
      alert("please load smart account first");
      return;
    }
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const to = smartAccount.address;
    const value = formData.get("value") as string;
    sendTransaction({ to, value: parseEther(value) });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const to = formData.get("address") as Hex;
    const value = formData.get("value") as string;
    const hash = await bundlerClient.sendUserOperation({
      account: smartAccount,
      calls: [
        {
          to: to,
          value: parseEther(value),
        },
      ],
    });

    console.log("hash", hash);
    setUOHash(hash);
  }

  return (
    <div className="container">
      <div className="stack">
        {smartAccount && <div>Smart Account: {smartAccount.address}</div>}
        {smartAccount && <div>Smart Account Balance: {smartAccountBalance.data?.formatted} ETH </div>}
        {smartAccountBalance.data?.value !== undefined && smartAccountBalance.data.value === 0n && (
          <p>Please fund your smart account first</p>
        )}
        <form className="set" onSubmit={fundSmartAccount}>
          <input name="value" placeholder="Amount (ETH)" type="number" step="0.000000001" required />
          <button disabled={isPending} type="submit">
            {isPending ? "Confirming..." : "Fund Smart Account"}
          </button>
        </form>
        <form className="set" onSubmit={submit}>
          <input name="address" placeholder="Address" required />
          <input name="value" placeholder="Amount (ETH)" type="number" step="0.000000001" required />
          <button type="submit" disabled={uoStatus === "pending"}>
            {uoStatus === "pending" ? "Confirming..." : "Send UserOperation"}
          </button>
        </form>

        {uoHash && <div>UserOperation Hash: {uoHash}</div>}
        {uoStatus && <div>UserOperation Status: {uoStatus}</div>}
        {error && <div>Error: {(error as BaseError).shortMessage || error.message}</div>}
      </div>
    </div>
  );
}
