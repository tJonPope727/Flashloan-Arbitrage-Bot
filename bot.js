const { WETH } = require("@sushiswap/sdk");
const { ethers } = require("hardhat");
require("dotenv").config();
// const etherss = require("ethers");
const Scalar = require("ffjavascript").Scalar;
const uniswapLib = require("./uniswap-lib");
const FLASHLOAN_CONTRACT = "0xdbBEF6D9e14904b59dc9D652334B31F0aB84Ef6e"; // Deployed Flashloan Contract address on Mainnet
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // Dai address
const FLASHLOAN_ABI = [
  {
    "inputs": [
      {
        "internalType": "contract IPoolAddressesProvider",
        "name": "_addressProvider",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_uniswapRouter",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_sushiswapRouter",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_weth",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ADDRESSES_PROVIDER",
    "outputs": [
      {
        "internalType": "contract IPoolAddressesProvider",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "POOL",
    "outputs": [
      {
        "internalType": "contract IPool",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "name": "executeFlashloan",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "assets",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "premiums",
        "type": "uint256[]"
      },
      {
        "internalType": "address",
        "name": "initiator",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "params",
        "type": "bytes"
      }
    ],
    "name": "executeOperation",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sushiswapRouter",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "uniswapRouter",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "weth",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenAddr",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "withdrawERC20",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]; // ABI of the Flashloan Contract

// Initialize provider and signer
const provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Initialize Flashloan contract instance
const flashloanContract = new ethers.Contract(FLASHLOAN_CONTRACT, FLASHLOAN_ABI, wallet);

let loanAmount = ethers.utils.parseEther("10000000"); // Initial loan amount
const loanAmountIn = 10000000;  //Initial loan amount
const loanFee = 0.0005

// Function to monitor arbitrage opportunities
async function monitorArbitrage() {
    while (true) {
        const isArbitrageAvailable = await checkArbitrageOpportunities();
       
        if (isArbitrageAvailable) {
            console.log("Arbitrage opportunity detected!");

            const tx = await flashloanContract.executeFlashloan(loanAmount, DAI_ADDRESS);
            await tx.wait();

            console.log("Arbitrage trade executed successfully!");

        }

        await new Promise(resolve => setTimeout(resolve, 30000)); // Check every 30 seconds
    }
}

// Placeholder function to check for arbitrage opportunities
async function checkArbitrageOpportunities() {
  const priceOfUniswap = await getPriceFromUniswap();
  
  const priceOfSushiswap = await getPriceFromSushiswap();

  const {
    gasPrice, maxFeePerGas, maxPriorityFeePerGas
    } = await provider.getFeeData();
  // { BigNumber: "23238878592" }

  console.log("WETH : ", priceOfUniswap, "Dai From Uniswap");
  console.log("WETH : ", priceOfSushiswap, "Dai From Sushiswap");

  // ...often this gas price is easier to understand or
  // display to the user in gwei
  console.log("gas price: ", ethers.utils.formatEther(maxFeePerGas),"Loan Amount: ", loanAmountIn, "FlashLoan Fee: ", loanAmountIn*loanFee, "Dai");
  
  const profit = ((priceOfSushiswap-priceOfUniswap)*loanAmountIn/priceOfUniswap)-20-loanAmountIn*loanFee-60000-1000;
  
  console.log("Profit: ", profit, "Dai");
  console.log("-----------------------------------------------------------------");
  if(profit>0){
    return true;
  }else {
    return false;
  }
}

// get price from uniswap
async function getPriceFromUniswap(){

    // load abi uniswap pair & pair addresses & erc20 abi
    const pairInfo = require("./config-uniswap/config-uniswap-pairs.json");
    const abiUniswapPair = require("./config-uniswap/abi-uniswap-pair.json").abi;
    const abiERC20 = require("./config-uniswap/abi-erc20.json").abi;

    // load params
    const provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_URL);

    // load contract pair uniswap
    const uniswapPair = new ethers.Contract(pairInfo.pairAddress, abiUniswapPair, provider);

    // get pair tokens and its info associated
    const addressToken0 = await uniswapPair.token0();
    const addressToken1 = await uniswapPair.token1();

    const reservesInfo = await uniswapPair.getReserves();

    const reserve0 = Scalar.e(reservesInfo.reserve0);
    const reserve1 = Scalar.e(reservesInfo.reserve1);

    // get info tokens
    const token0 = new ethers.Contract(addressToken0, abiERC20, provider);
    const token1 = new ethers.Contract(addressToken1, abiERC20, provider);

    const token0Decimals = await token0.decimals();
    const token1Decimals = await token1.decimals();

    const token0Symbol = await token0.symbol();
    const token1Symbol = await token1.symbol();

    // sort tokens & compute price
    if (pairInfo.mainReserveSymbol !== token0Symbol && pairInfo.mainReserveSymbol !== token1Symbol)
        throw Error(`${pairInfo.mainReserveSymbol} has not been found in uniswap pair ${pairInfo.pairAddress}`);

    const amountIn = Scalar.pow(10, token0Decimals);
    const amountOut = uniswapLib.getAmountOut(amountIn, reserve0, reserve1);

    // compute price
    const finalAmountIn = Number(amountIn) / 10**token0Decimals;
    const finalAmountOut = Number(amountOut) / 10**token1Decimals;

    const price = finalAmountIn / finalAmountOut;
    return price;
}

// get price from sushiswap
async function getPriceFromSushiswap() {

    const abiERC20 = require("./config-uniswap/abi-erc20.json").abi;

    // load abi sushiswap pair & pair addresses
    const sushiswap_pairInfo = require("./config-uniswap/sushiswap_config-uniswap-pairs.json");
    const sushiswap_abiUniswapPair = require("./config-uniswap/sushiswap_abi-uniswap-pair.json").abi;

    // load params
    const provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_URL);

    // load contract pair sushiswap
    const sushiswapPair = new ethers.Contract(sushiswap_pairInfo.pairAddress, sushiswap_abiUniswapPair, provider);

    // get pair tokens and its info associated from sushiswap
    const sushiswap_addressToken0 = await sushiswapPair.token0();
    const sushiswap_addressToken1 = await sushiswapPair.token1();

    const sushiswap_reservesInfo = await sushiswapPair.getReserves();

    const sushiswap_reserve0 = Scalar.e(sushiswap_reservesInfo._reserve0);
    const sushiswap_reserve1 = Scalar.e(sushiswap_reservesInfo._reserve1);

    // get info tokens
    const sushiswap_token0 = new ethers.Contract(sushiswap_addressToken0, abiERC20, provider);
    const sushiswap_token1 = new ethers.Contract(sushiswap_addressToken1, abiERC20, provider);

    const sushiswap_token0Decimals = await sushiswap_token0.decimals();
    const sushiswap_token1Decimals = await sushiswap_token1.decimals();

    const sushiswap_token0Symbol = await sushiswap_token0.symbol();
    const sushiswap_token1Symbol = await sushiswap_token1.symbol();

    // sort tokens & compute price from sushiswap
    if (sushiswap_pairInfo.mainReserveSymbol !== sushiswap_token0Symbol && sushiswap_pairInfo.mainReserveSymbol !== sushiswap_token1Symbol)
        throw Error(`${sushiswap_pairInfo.mainReserveSymbol} has not been found in uniswap pair ${sushiswap_pairInfo.pairAddress}`);

    const sushiswap_amountIn = Scalar.pow(10, sushiswap_token0Decimals);
    const sushiswap_amountOut = uniswapLib.getAmountOut(sushiswap_amountIn, sushiswap_reserve0, sushiswap_reserve1);

    // compute price  from sushiswap
    const sushiswap_finalAmountIn = Number(sushiswap_amountIn) / 10**sushiswap_token0Decimals;
    const sushiswap_finalAmountOut = Number(sushiswap_amountOut) / 10**sushiswap_token1Decimals;

    //sushiswap
    const sushiswap_price = sushiswap_finalAmountIn / sushiswap_finalAmountOut;
    return sushiswap_price;
}

// Placeholder function to calculate profit
async function calculateProfit() {
    // Implement logic to calculate the profit from the last trade
    return ethers.utils.parseEther("0.2"); // Example profit
}

monitorArbitrage().catch(console.error);
