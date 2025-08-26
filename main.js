// Import the required modules.
import { createSmartAccountClient } from "permissionless";
import { createPaymasterClient } from "viem/account-abstraction";
import { sepolia } from "viem/chains";
import { http } from "viem";

const paymaster = createPaymasterClient({
  transport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${pimlicoApiKey}`),
});

const account =
  toSimpleSmartAccount <
  entryPointVersion >
  {
    client: getPublicClient(anvilRpc),
    owner: privateKeyToAccount(generatePrivateKey()),
  };

// Create the required clients.
const bundlerClient = createSmartAccountClient({
  account,
  paymaster,
  chain: sepolia,
  bundlerTransport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${pimlicoApiKey}`), // Use any bundler url
});

// Consume bundler, paymaster, and smart account actions!
const userOperationReceipt = await bundlerClient.getUserOperationReceipt({
  hash: "0x5faea6a3af76292c2b23468bbea96ef63fb31360848be195748437f0a79106c8",
});
