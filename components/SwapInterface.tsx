"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "./ui/input"
import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { clusterApiUrl, Connection, VersionedTransaction, TransactionSignature, Transaction, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import fetch from 'cross-fetch';
import { Buffer } from 'buffer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AlertCircle } from "lucide-react"
import {
  Alert,
  AlertDescription
} from "@/components/ui/alert"
import { getTokenBalance, getQuote } from "@/app/lib/actions"
import { useToast } from "./ui/use-toast"
import Link from "next/link"

interface Token{
  logoURI: string,
  id?: string,
  symbol: string,
  decimals?: number,
}

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY! || '';
const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`

export default function Swap(){
    const connection = new Connection(url);
    const { publicKey, sendTransaction, signTransaction} = useWallet();
    const { toast } = useToast();
    const [inputAmount, setInputAmount] = useState<number>(0);
    const [selectedInputToken, setselectedInputToken] = useState<Token>({symbol: "SOL", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"})
    const [selectedOutputToken, setselectedOutputToken] = useState<Token>({symbol: "USDC", logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"})
    const [outputAmount,setOutputAmount] = useState<number>(0);
    const [slippage, setSlippage] = useState<number>(0.5);
    const [topTokens, setTopTokens] = useState<Token[]>([]);

    useEffect(() => {
      async function getPrice(){
        try{
        const res = await fetch(`https://price.jup.ag/v6/price?ids=${selectedInputToken.symbol}&vsToken=${selectedOutputToken.symbol}`)
        const data = await res.json();
        const price = (data.data[selectedInputToken.symbol].price * inputAmount) || 0;
        setOutputAmount(price);
        }
        catch(err){
          console.log(err)
        }
      }
      getPrice();
    }, [selectedInputToken, selectedOutputToken, inputAmount]);

    useEffect(() => {
      async function getTopTokens(){
        try{
        const res = await fetch("https://token.jup.ag/strict")
        const data = await res.json();
        const tokens = data.slice(0,50)
        setTopTokens(tokens)
        }
        catch(error){
          console.log(error)
        }
      }
      getTopTokens();
    }, [])


    function swapValues(){
      const temp1 = selectedInputToken;
      const temp2 = inputAmount;
      setselectedInputToken(selectedOutputToken)
      setInputAmount(outputAmount);
      setselectedOutputToken(temp1);
      setOutputAmount(temp2);
    }   

    async function handleSubmit(){
      try {
      const quoteResponse = await getQuote(selectedInputToken.symbol, selectedOutputToken.symbol, inputAmount, slippage)
      if(!quoteResponse){
        toast({
          title: "Quote Not Found!",
          description: "The quote for the given tokens doesn't exist."
        })
      }

      const { swapTransaction } = await (
        await fetch('https://quote-api.jup.ag/v6/swap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quoteResponse,
            userPublicKey: publicKey!.toString(),
            wrapAndUnwrapSol: true,
            // feeAccount: "fee_account_public_key"
          })
        })
      ).json();

      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight }
    } = await connection.getLatestBlockhashAndContext();

      const sign = await sendTransaction(transaction, connection, {minContextSlot});

      if(!sign){
        toast({
          title: "Transaction Failed!",
          description: "Signature not found"
        })
      }
      const rawTransaction = transaction.serialize()
      const txid = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 2
      });
      
      toast({
        action: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><circle fill="#C1FFF8" stroke="#C1FFF8" stroke-width="2" r="2.5" cx="10" cy="16.25"><animate attributeName="cy" calcMode="spline" dur="2" values="16.25;33.75;16.25;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.4"></animate></circle><circle fill="#C1FFF8" stroke="#C1FFF8" stroke-width="2" r="2.5" cx="25" cy="16.25"><animate attributeName="cy" calcMode="spline" dur="2" values="16.25;33.75;16.25;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.2"></animate></circle><circle fill="#C1FFF8" stroke="#C1FFF8" stroke-width="2" r="2.5" cx="40" cy="16.25"><animate attributeName="cy" calcMode="spline" dur="2" values="16.25;33.75;16.25;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="0"></animate></circle></svg>,
        description: "Confirming Transaction..."
      })

      const confirmation = await connection.confirmTransaction({blockhash, lastValidBlockHeight, signature: sign});
      if(confirmation){
        toast({
          title: "Transaction Confirmed!",
          action: <Button><Link href={`https://explorer.solana.com/tx/${sign}?cluster=mainnet-beta`}>Show In Explorer</Link></Button>
        })
      }
    }
    catch(error: any){
      toast({
        title: "Swap Failed!",
        description: `${error?.message}`
      })
    }
    }

    return (
      <div className="flex flex-col">
      <h1 className="mx-auto mb-5 justify-center opacity-80 text-[3.5rem] font-bold z-20 bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-400">SPL Swaps</h1>
      <div className="relative rounded-lg w-[32rem] mt--64 overscroll-y-none">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-700 rounded-[100px] blur-[54px] opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
        <div className="relative bg-black bg-opacity-[0.85] z-10 p-6 rounded-lg w-[32rem] text-white items-center justify-center">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold">You are paying</h2>
            <div className="flex space-x-2">
              <div className="">
            <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="rounded-full h-6 w-[5rem] mb-8">
        <div className="flex flex-col p-0 ml-[-2px]">
        <svg className="m-0 p-0" fill="#ffffff" width="16px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1"><path d="M21,11H17.81573a2.98208,2.98208,0,0,0-5.63146,0H3a1,1,0,0,0,0,2h9.18433a2.982,2.982,0,0,0,5.6314,0H21a1,1,0,0,0,0-2Zm-6,2a1,1,0,1,1,1-1A1.0013,1.0013,0,0,1,15,13Z"/></svg>
        <svg className="mt-[-16px] p-0" fill="#ffffff" width="16px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" transform="rotate(180)" data-name="Layer 1"><path d="M21,11H17.81573a2.98208,2.98208,0,0,0-5.63146,0H3a1,1,0,0,0,0,2h9.18433a2.982,2.982,0,0,0,5.6314,0H21a1,1,0,0,0,0-2Zm-6,2a1,1,0,1,1,1-1A1.0013,1.0013,0,0,1,15,13Z"/></svg>
        </div>
          <a className="font-bold text-[0.7rem] ml-2">{slippage}</a>
          </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enter Slippage</AlertDialogTitle>
          <AlertDialogDescription></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex">
          <Input type="number" min="0.1" maxLength={5} max="100" step="0.01" defaultValue={slippage} className="col-span-2 w-full bg-black text-white h-10" onChange={(e) => {if(parseFloat(e.target.value) > 100){e.target.value = "100"; setSlippage(100)} else{ setSlippage(Math.round(parseFloat(e.target.value) * 100)/100 || 0.5)}}}/>
          <AlertDialogAction>Save Slippage</AlertDialogAction>
        </AlertDialogFooter>
        {(slippage>5) && (<Alert color="yellow" variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Your transaction may be frontrun and result in an unfavourable trade.</AlertDescription>
        </Alert>)}
        {(slippage>50) && (<Alert color="yellow" variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Please set a slippage value that is within 0% to 50%</AlertDescription>
        </Alert>)}
      </AlertDialogContent>
    </AlertDialog>
    </div>
              <Button onClick={async() => {const balance = await getTokenBalance(selectedInputToken.symbol, publicKey!?.toString()); setInputAmount(balance)}} className="bg-[#333333] w-10 h-6 text-[0.5rem] px-2 font-bold text-slate-400">MAX</Button>
              <Button onClick={async() => {const balance = await getTokenBalance(selectedInputToken.symbol, publicKey!?.toString()); setInputAmount(balance/2)}} className="bg-[#333333] w-10 h-6 text-[0.5rem] px-2 font-bold text-slate-400">HALF</Button>
            </div>
          </div>
          <div className="border-white border-[1px] p-4 rounded-lg flex items-center justify-between mb-4">
            <img src={`${selectedInputToken.logoURI}`} width={24} height={24} className="fixed rounded-full"/> 
          <h3 className="text-1xl font-bold ml-8">{selectedInputToken.symbol}</h3>
          <div className="ml-[7rem] fixed">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex gap-2">
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="h-36 w-52 overflow-y-scroll" align="end">
                {topTokens.map((token: Token) => {
                  return(
                  <DropdownMenuItem key={token.id} onClick={() => setselectedInputToken({symbol: token.symbol, logoURI: token.logoURI})} className={selectedInputToken.symbol === token.symbol ? "bg-gray-100 dark:bg-gray-800 py-1 cursor-pointer w-52" : "py-1 cursor-pointer w-52"}>
                <Avatar className="mx-1">
                <AvatarImage src={`${token.logoURI}`} />
                <AvatarFallback>SPL</AvatarFallback>
                </Avatar>
                  <a className="mx-1 font-semibold">{token.symbol}</a>
                  </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
            <div className="text-right">
            <Input
                  type="number"
                  id="inputamount"
                  autoComplete='off'
                  className="text-white w-64 focus:ring-offset-0 text-1.5xl h-full font-semibold ring-0 border-transparent border-none focus:border-none focus:outline-0 focus:border-transparent focus:ring-0 outline-0 box shadow-none focus:shadow-none text-right bg-transparent"
                  placeholder="0.00"
                  value={inputAmount}
                  required
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {setInputAmount(parseFloat(e.target.value))}}
                >
                </Input>
            </div>
          </div>
            <svg fill="#ffffff" viewBox="0 0 24 24" width="48" height="48" className="mx-auto p-2 cursor-pointer" onClick={swapValues} xmlns="http://www.w3.org/2000/svg"><g stroke="#1c274c" stroke-width="1.5"><circle cx="12" cy="12" opacity=".5" r="10"/><g stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 8v8m0 0-2.5-2.75m2.5 2.75 2.5-2.75"/><path d="m14.5 16v-8m0 0-2.5 2.75m2.5-2.75 2.5 2.75"/></g></g></svg>
            <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold">To receive</h2>
          </div>
          <div className="border-white border-[1px] p-4 rounded-lg flex items-center justify-between mb-4">
          <img src={`${selectedOutputToken.logoURI}`} width={24} height={24} className="fixed rounded-full"/> 
          <h3 className="text-1xl font-bold ml-8">{selectedOutputToken.symbol}</h3>
          <div className="ml-[7rem] fixed">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex mr--32">
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="h-36 w-52 overflow-y-scroll">
                {topTokens.map((token: Token) => {
                  return(
                  <DropdownMenuItem key={token.id} onClick={() => setselectedOutputToken({symbol: token.symbol, logoURI: token.logoURI})} className={selectedOutputToken.symbol === token.symbol ? "bg-gray-100 dark:bg-gray-800 py-1 cursor-pointer w-52" : "py-1 cursor-pointer w-52"}>
                  {/* {isValid ? <img className="mx-1 rounded-full" src={`${token.logoURI}`} width={26} height={26} /> : <img className="mx-1 rounded-full" src="https://png.pngtree.com/png-vector/20190420/ourmid/pngtree-question-mark-vector-icon-png-image_963976.jpg" width={26} height={26} />} */}
                      <Avatar className="">
                      <AvatarImage src={`${token.logoURI}`} />
                      <AvatarFallback>SPL</AvatarFallback>
                      </Avatar>
                      <a className="mx-1 font-semibold">{token.symbol}</a>
                  </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
            <div className="text-right">
              <a className="text-1.5xl font-semibold">{outputAmount || 0}</a>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            
          </div>
          <Button className="w-full py-3" disabled={!publicKey} onClick={handleSubmit}>Swap</Button>
        </div>
        </div>
        </div>
      )
    }

    function ChevronDownIcon(props: any) {
      return (
        <svg
          {...props}
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      )
    }