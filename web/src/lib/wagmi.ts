import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { giwaSepolia } from "./chain";

export const config = createConfig({
  chains: [giwaSepolia],
  connectors: [injected()],
  transports: { [giwaSepolia.id]: http() },
});
