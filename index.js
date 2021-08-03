const { exec } = require('child_process');
const colors = require('colors');

const tty = process.platform === 'win32' ? 'CON' : '/dev/tty';

const getCommits = (projectDir, limit = 4) =>
  new Promise((resolve, reject) => {
    exec(
      `git shortlog -sn --no-merges < ${tty}`,
      { cwd: projectDir },
      (err, stdout) => {
        if (err) return reject(err);
        const result = stdout
          .trim()
          .split('\n')
          .slice(0, +limit)
          .map((line) => line.trim().split('\t'));
        resolve(result);
      }
    );
  });

const getStatisticByUser = (projectDir, user) =>
  new Promise((resolve, reject) => {
    exec(
      `git log --no-merges --shortstat --author="${user.replace(
        /\\/g,
        '\\\\\\'
      )}"  < ${tty} | grep -E "fil(e|es) changed"`,
      { cwd: projectDir },
      (err, stdout) => {
        if (err) return reject(err);
        const result = stdout
          .trim()
          .split('\n')
          .map((line) => line.trim().split(' '));

        const stat = {
          files: 0,
          lineAdded: 0,
          lineDeleted: 0,
          lines: 0,
          ratio: ''
        };
        for (const row of result) {
          stat.files += +row[0];
          stat.lineAdded += +row[3];
          if (row.length > 5) {
            stat.lineDeleted += +row[5];
          }
        }
        stat.lines = stat.lineAdded - stat.lineDeleted;
        stat.ratio = ((100 * stat.lineDeleted) / stat.lineAdded).toPrecision(4);

        const finalRet = `\t- Files changed (total)..  ${
          stat.files.toString().bold.blue
        }
\t- Lines added (total)....  ${stat.lineAdded.toString().bold.green}
\t- Lines deleted (total)..  ${stat.lineDeleted.toString().bold.red}
\t- Total lines (delta)....  ${stat.lines.toString().bold.yellow}
\t- Del./Add. ratio (percent)..  ${(stat.ratio.toString() + '%').bold.yellow}`;
        resolve(finalRet);
      }
    );
  });

const run = async () => {
  const [projectDir, limit] = process.argv.slice(2);
  console.log(
    `Top ${limit.bold.blue} contributors of the project: ${projectDir.bold.blue}`
  );
  const commits = await getCommits(projectDir, limit);
  for (const [commitNum, user] of commits) {
    console.log(
      `\nUser ${user.green} made ${commitNum.yellow} commit${
        commitNum > 1 ? 's' : ''
      }`
    );
    const statistics = await getStatisticByUser(projectDir, user);
    console.log(statistics);
  }
};

run();
