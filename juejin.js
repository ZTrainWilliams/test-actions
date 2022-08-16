const JuejinHelper = require("juejin-helper");

const JUEJIN_COOKIE_KEY = process.env?.JUEJIN_COOKIE_KEY;
// 海底掘金游戏
async function runSeagold(juejin) {
  if (juejin.seagold) {
    const seagold = juejin.seagold();

    await seagold.gameLogin(); // 登陆游戏

    let gameInfo = null;

    const info = await seagold.gameInfo(); // 游戏状态
    if (info.gameStatus === 1) {
      gameInfo = info.gameInfo; // 继续游戏
    } else {
      gameInfo = await seagold.gameStart(); // 开始游戏
    }

    const command = ["U", "L"];
    await seagold.gameCommand(gameInfo.gameId, command); // 执行命令

    const result = await seagold.gameOver(); // 游戏结束
    console.log('seagold', result); // => { ... }
  } else {
    console.log("no seagold");
  }
}

// bugfix 游戏
async function runBugFix(juejin) {
  if (juejin.bugfix) {
    const bugfix = juejin.bugfix();

    const notCollectBugList = await bugfix.getNotCollectBugList();
    await bugfix.collectBugBatch(notCollectBugList);
    console.log(`收集Bug ${notCollectBugList.length}`);

    const competition = await bugfix.getCompetition();
    const bugfixInfo = await bugfix.getUser(competition);
    console.log(`未消除Bug数量 ${bugfixInfo.user_own_bug}`);
  } else {
    console.log("no Bugfix");
  }
}

async function run() {
  const juejin = new JuejinHelper();
  await juejin.login(JUEJIN_COOKIE_KEY);

  const growth = juejin.growth();

  // 签到
  await growth.checkIn();

  // 获取当前矿石数
  // await growth.getCurrentPoint();

  // 获取统计签到天数
  // await growth.getCounts();

  // 获取今日签到状态
  // await growth.getTodayStatus();

  // 获取抽奖配置
  // await growth.getLotteryConfig();

  // 抽奖
  // await growth.drawLottery();

  // 获取抽奖幸运用户
  // await growth.getLotteriesLuckyUsers({ page_no: 1, page_size: 5 }); // => { lotteries: [{ lottery_history_id }, ...] }

  // 获取我的幸运值
  // await growth.getMyLucky();

  // 沾喜气
  // await growth.dipLucky(lottery_history_id); // => { has_dip, dip_value, total_value, dip_action }

  runSeagold();
  runBugFix();

  await juejin.logout();
}

run();
