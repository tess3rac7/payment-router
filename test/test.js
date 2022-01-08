const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaymentRouter", function () {
  let owner, tess, bongo, degenicus, rando;
  let routerFactory, router, tokenFactory, token;
  let geistStrat, masonryStrat, stablecoinStrat;

  beforeEach(async function () {
    [
      owner,
      tess,
      bongo,
      degenicus,
      rando,
      geistStrat,
      masonryStrat,
      stablecoinStrat,
    ] = await ethers.getSigners();
    routerFactory = await ethers.getContractFactory("PaymentRouter");
    router = await routerFactory.deploy([
      tess.address,
      bongo.address,
      degenicus.address,
    ]);
    tokenFactory = await ethers.getContractFactory("TestToken");
    token = await tokenFactory.deploy(ethers.BigNumber.from(65000));
    await router.deployed();
  });

  it("Should assign the STRATEGIST role upon deployment", async function () {
    expect(await router.getRoleMemberCount(router.STRATEGIST())).to.equal(
      ethers.BigNumber.from(3)
    );
    expect(await router.hasRole(router.STRATEGIST(), tess.address)).to.be.true;
    expect(await router.hasRole(router.STRATEGIST(), bongo.address)).to.be.true;
    expect(await router.hasRole(router.STRATEGIST(), degenicus.address)).to.be
      .true;
  });

  it("Should only allow owner or strategists to add strategies", async function () {
    // rando tries to add strategy, reverts
    await expect(
      router
        .connect(rando)
        .addStrategy(
          geistStrat.address,
          [tess.address],
          [ethers.BigNumber.from(100)]
        )
    ).to.be.reverted;

    // owner adds, doesn't revert
    await router.addStrategy(
      masonryStrat.address,
      [bongo.address, degenicus.address],
      [ethers.BigNumber.from(100), ethers.BigNumber.from(100)]
    );

    // strategist adds, doesn't revert
    await router
      .connect(degenicus)
      .addStrategy(
        stablecoinStrat.address,
        [tess.address, bongo.address, degenicus.address],
        [
          ethers.BigNumber.from(100),
          ethers.BigNumber.from(100),
          ethers.BigNumber.from(100),
        ]
      );
  });

  it("Should track splitters and corresponding strategists", async function () {
    // initially no splitter for strat
    expect(await router.splitterForStrategy(masonryStrat.address)).to.equal(
      ethers.constants.AddressZero
    );
    await router.addStrategy(
      masonryStrat.address,
      [bongo.address, degenicus.address],
      [ethers.BigNumber.from(100), ethers.BigNumber.from(100)]
    );

    // once strat added splitter gets created
    let splitterAddress = await router.splitterForStrategy(
      masonryStrat.address
    );
    expect(splitterAddress).to.not.equal(ethers.constants.AddressZero);
    expect(
      await router.splittersForStrategist(
        bongo.address,
        ethers.BigNumber.from(0)
      )
    ).to.equal(splitterAddress);
    expect(
      await router.splittersForStrategist(
        degenicus.address,
        ethers.BigNumber.from(0)
      )
    ).to.equal(splitterAddress);
    await expect(
      router.splittersForStrategist(tess.address, ethers.BigNumber.from(0))
    ).to.be.reverted;

    // initially no splitter for strat
    expect(await router.splitterForStrategy(stablecoinStrat.address)).to.equal(
      ethers.constants.AddressZero
    );
    await router
      .connect(degenicus)
      .addStrategy(
        stablecoinStrat.address,
        [tess.address, bongo.address, degenicus.address],
        [
          ethers.BigNumber.from(100),
          ethers.BigNumber.from(100),
          ethers.BigNumber.from(100),
        ]
      );

    // once strat added splitter gets created
    splitterAddress = await router.splitterForStrategy(stablecoinStrat.address);
    expect(splitterAddress).to.not.equal(ethers.constants.AddressZero);
    expect(
      await router.splittersForStrategist(
        bongo.address,
        ethers.BigNumber.from(1)
      )
    ).to.equal(splitterAddress);
    expect(
      await router.splittersForStrategist(
        degenicus.address,
        ethers.BigNumber.from(1)
      )
    ).to.equal(splitterAddress);
    expect(
      await router.splittersForStrategist(
        tess.address,
        ethers.BigNumber.from(0)
      )
    ).to.equal(splitterAddress);
  });

  it("Should only allow payments from registered strats and route correctly", async function () {
    // send some tokens to the strats
    await token.transfer(geistStrat.address, ethers.BigNumber.from(5000));
    await token.transfer(masonryStrat.address, ethers.BigNumber.from(7000));

    await token
      .connect(geistStrat)
      .approve(router.address, ethers.BigNumber.from(120));
    await token
      .connect(masonryStrat)
      .approve(router.address, ethers.BigNumber.from(150));

    // sending tokens from strats to router reverts since not registered yet
    await expect(
      router
        .connect(geistStrat)
        .routePayment(token.address, ethers.BigNumber.from(120))
    ).to.be.reverted;
    await expect(
      router
        .connect(masonryStrat)
        .routePayment(token.address, ethers.BigNumber.from(150))
    ).to.be.reverted;

    // now add strategies to router
    await router.addStrategy(
      geistStrat.address,
      [tess.address],
      [ethers.BigNumber.from(100)]
    );
    await router.addStrategy(
      masonryStrat.address,
      [bongo.address, degenicus.address],
      [ethers.BigNumber.from(100), ethers.BigNumber.from(100)]
    );

    expect(
      await token.balanceOf(
        await router.splitterForStrategy(geistStrat.address)
      )
    ).to.equal(ethers.BigNumber.from(0));
    // doesn't revert now
    router
      .connect(geistStrat)
      .routePayment(token.address, ethers.BigNumber.from(120));
    expect(
      await token.balanceOf(
        await router.splitterForStrategy(geistStrat.address)
      )
    ).to.equal(ethers.BigNumber.from(120));

    expect(
      await token.balanceOf(
        await router.splitterForStrategy(masonryStrat.address)
      )
    ).to.equal(ethers.BigNumber.from(0));
    // doesn't revert now
    router
      .connect(masonryStrat)
      .routePayment(token.address, ethers.BigNumber.from(150));
    expect(
      await token.balanceOf(
        await router.splitterForStrategy(masonryStrat.address)
      )
    ).to.equal(ethers.BigNumber.from(150));
  });

  it("Should allow strategists to pull owed amounts", async function () {
    // add all three strats
    await router.addStrategy(
      geistStrat.address,
      [tess.address],
      [ethers.BigNumber.from(100)]
    );

    await router.addStrategy(
      masonryStrat.address,
      [bongo.address, degenicus.address],
      [ethers.BigNumber.from(100), ethers.BigNumber.from(100)]
    );

    await router.addStrategy(
      stablecoinStrat.address,
      [tess.address, bongo.address, degenicus.address],
      [
        ethers.BigNumber.from(100),
        ethers.BigNumber.from(100),
        ethers.BigNumber.from(100),
      ]
    );

    // send some funds to router from each strat
    await token.transfer(geistStrat.address, ethers.BigNumber.from(5000));
    await token.transfer(masonryStrat.address, ethers.BigNumber.from(7000));
    await token.transfer(stablecoinStrat.address, ethers.BigNumber.from(10000));

    await token
      .connect(geistStrat)
      .approve(router.address, ethers.BigNumber.from(120));
    await token
      .connect(masonryStrat)
      .approve(router.address, ethers.BigNumber.from(150));
    await token
      .connect(stablecoinStrat)
      .approve(router.address, ethers.BigNumber.from(180));

    router
      .connect(geistStrat)
      .routePayment(token.address, ethers.BigNumber.from(120));
    router
      .connect(masonryStrat)
      .routePayment(token.address, ethers.BigNumber.from(150));
    router
      .connect(stablecoinStrat)
      .routePayment(token.address, ethers.BigNumber.from(180));

    // rando can't pull
    await expect(router.connect(rando).release(token.address)).to.be.reverted;

    // but strategists can (thier initial balances are 0)
    expect(await token.balanceOf(tess.address)).to.equal(
      ethers.BigNumber.from(0)
    );
    await router.connect(tess).release(token.address);
    expect(await token.balanceOf(tess.address)).to.equal(
      ethers.BigNumber.from(180) // full geist + 1/3rd stablecoin
    );
    await router.connect(tess).release(token.address); // pulling again doesn't revert

    expect(await token.balanceOf(bongo.address)).to.equal(
      ethers.BigNumber.from(0)
    );
    await router.connect(bongo).release(token.address);
    expect(await token.balanceOf(bongo.address)).to.equal(
      ethers.BigNumber.from(135) // 1/2 masonry + 1/3rd stablecoin
    );
    await router.connect(bongo).release(token.address); // pulling again doesn't revert

    expect(await token.balanceOf(degenicus.address)).to.equal(
      ethers.BigNumber.from(0)
    );
    await router.connect(degenicus).release(token.address);
    expect(await token.balanceOf(degenicus.address)).to.equal(
      ethers.BigNumber.from(135) // 1/2 masonry + 1/3rd stablecoin
    );
    await router.connect(degenicus).release(token.address); // pulling again doesn't revert
  });
});
