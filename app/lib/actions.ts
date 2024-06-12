"use server"

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Token } from "../types/token";

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY! || '';
const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
const connection = new Connection(url);

export async function getQuote(inputToken: string, outputToken: string, inputAmount: number, slippage: number){
    const inp_mint = (await (await fetch(`https://price.jup.ag/v6/price?ids=${inputToken}`)).json()).data[inputToken].id;
    const out_mint = (await (await fetch(`https://price.jup.ag/v6/price?ids=${outputToken}`)).json()).data[outputToken].id;

      const mint:any = await connection.getParsedAccountInfo(new PublicKey(inp_mint))!
      const decimals = mint.value?.data?.parsed.info.decimals;
      let amount;
      if(!decimals){
        amount = Math.floor(inputAmount * LAMPORTS_PER_SOL);
      }
      amount = Math.floor(inputAmount * (10**decimals));
      const quoteResponse = await (
        await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inp_mint}&outputMint=${out_mint}&amount=${amount}&slippageBps=${slippage*1000}`)).json();
        console.log({ quoteResponse })
     return quoteResponse;
}

export async function getTokenBalance(symbol: string, publicKey: string): Promise<number>{
    if(!publicKey || !symbol){
        return 0;
    }
    if(symbol == "SOL"){
        const solbalance = await connection.getBalance(new PublicKey(publicKey));
        return solbalance/(10**9);
    }
    const getAssetsByOwner = async () => {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'my-id',
        method: 'getAssetsByOwner',
        params: {
            ownerAddress: publicKey,
            page: 1, // Starts at 1
            limit: 1000,
            displayOptions: {
                showFungible: true, //return both fungible and non-fungible tokens
            }
        },
        }),
    });
    const { result } = await response.json();
    return result;
    };
    const result = await getAssetsByOwner(); 
    const requiredTokens = result.items.filter((token:Token) => (token.interface === "FungibleToken" || token.interface === "FungibleAsset"))
    const requiredToken = requiredTokens.find((token:Token) => token.content.metadata.symbol === symbol);
    if(!requiredToken){
        return 0;
    }
    const decimals = requiredToken.token_info.decimals
    const requiredBalance = (requiredToken.token_info.balance)/(10 ** decimals);
    return requiredBalance;
}