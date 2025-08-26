import { createPublicClient, http, parseEther } from "viem";
import { createBundlerClient, toCoinbaseSmartAccount } from "viem/account-abstraction";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const client = createPublicClient({
  chain: sepolia,
  transport: http(),
});

const bundlerClient = createBundlerClient({
  client,
  transport: http("https://public.pimlico.io/v2/1/rpc"),
});

const owner = privateKeyToAccount("0x...");

const account = await toCoinbaseSmartAccount({
  client,
  owners: [owner],
  version: "1.1",
});

const hash = await bundlerClient.sendUserOperation({
  account,
  calls: [
    {
      to: "0xcb98643b8786950F0461f3B0edf99D88F274574D",
      value: parseEther("0.001"),
    },
  ],
});

const receipt = await bundlerClient.waitForUserOperationReceipt({ hash });
