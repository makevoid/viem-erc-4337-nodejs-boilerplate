import { createPublicClient, http, parseEther } from "viem";
import { createBundlerClient, toCoinbaseSmartAccount } from "viem/account-abstraction";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";

dotenv.config();

const client = createPublicClient({
  chain: sepolia,
  transport: http(),
});

const bundlerClient = createBundlerClient({
  client,
  transport: http("https://public.pimlico.io/v2/1/rpc"),
});

const owner = privateKeyToAccount(process.env.PRIVATE_KEY);

const account = await toCoinbaseSmartAccount({
  client,
  owners: [owner],
  version: "1.1",
});

const hash = await bundlerClient.sendUserOperation({
  account,
  calls: [
    {
      to: owner.address, // NOTE: send transaction to yourself
      value: parseEther("0.001"),
    },
  ],
});

const receipt = await bundlerClient.waitForUserOperationReceipt({ hash });
