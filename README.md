# Payment router contract
> A Byte Masons Joint.

## Installation
- Clone the repo.
- We have locked the node version to minimize setup errors, please see `.nvmrc` for the current recommend version or run `nvm use` in the root folder if you have `nvm` installed.
- Install NPM dependencies using `npm install` or `yarn install`.


## .env configuration

Once the libraries are installed you will need to configure ENV variables. Run this bash command to create your local `.env` file.
```bash
cp .env.example .env
```

And then replace the placeholder texts as appropriate.


| ENV | Description |
|:--- |:------------|
| FTMSCAN_API_KEY | The api key from [FtmScan](https://ftmscan.com/myapikey). Create an account and a new API key, then replace the placeholder text. |
| DEPLOYER_PRIVATE_KEY | The account to use when deploying the contract. Replace the placeholder text with your dev/release accounts private key, without the 0x prefix. |

_Note:The `.env` file is listed in .gitignore and will not be added to git._

### Testnet fantom from faucet
If you are testing things out in development you might want to use the Fantom testnet to do so, in this case, you will need some Fantom tokens on the testnet to pay for gas, to interact with other contracts and to be able to deploy. please go to the [faucet](https://faucet.fantom.network) and enter the same dev address as used for `DEPLOYER_PRIVATE_KEY` and you will receive 10 testnet Fantom in your wallet.

## Deploying the contract
With a valid .env file in place, first deploy your contract:

```shell
npx hardhat run --network testnet scripts/deploy.js
```
On success, this will print  the contract address to the terminal, like so:
```bash
PaymentRouter deployed to: 0xd30B8V864F2751458c3a52A8511b29A535f13017
```



## Hardhat
This project was created using HardHat init project, so the available commands are listed as:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.js
node scripts/deploy.js
npx eslint '**/*.js'
npx eslint '**/*.js' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```