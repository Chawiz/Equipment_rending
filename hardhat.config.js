require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.24",
  networks: {
    mynet: {
      url: "http://127.0.0.1:8545", // Update with your actual RPC if needed
      accounts: ["4d5a688b20c271ed87cc3f5bfb6be50cfff78fd8dacd04c20d359d67dd55718e"] // ⚠️ never commit this
    }
  }
};
