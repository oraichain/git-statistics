const { exec } = require('child_process');
const path = require('path');
const { Table } = require('console-table-printer');

const tty = process.platform === 'win32' ? 'CON' : '/dev/tty';

const getCommits = (projectDir, limit) =>
  new Promise((resolve, reject) => {
    exec(
      `git shortlog -sne --no-merges < ${tty}`,
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

const getStatisticByUser = (projectDir, email) =>
  new Promise((resolve, reject) => {
    exec(
      `git log --no-merges --shortstat --author="${email}"  < ${tty} | grep -E "fil(e|es) changed"`,
      { cwd: projectDir },
      (err, stdout) => {
        if (err) return reject(err);
        const result = stdout
          .trim()
          .split('\n')
          .map((line) => line.trim().split(' '));

        const stat = {
          files: 0,
          added: 0,
          deleted: 0
          // lines: 0,
          // ratio: ''
        };
        for (const row of result) {
          stat.files += +row[0];
          stat.added += +row[3];
          if (row.length > 5) {
            stat.deleted += +row[5];
          }
        }
        // stat.lines = stat.added - stat.deleted;
        // stat.ratio = ((100 * stat.deleted) / stat.added)
        //   .toFixed(2)
        //   .replace(/\.?0+$/, '');
        resolve(stat);
      }
    );
  });

const run = async () => {
  const projectDirs = process.argv.slice(2);
  const limitIndex = projectDirs.indexOf('--limit');
  let limit = 4;
  if (limitIndex !== -1) {
    limit = projectDirs.splice(limitIndex, 2)[1];
  }
  for (const projectDir of projectDirs) {
    console.log(
      `Top ${limit} contributors of the project: ${path.basename(
        path.resolve(projectDir)
      )}`
    );
    const p = new Table({
      columns: [
        { name: 'user', title: 'User', color: 'magenta' },
        { name: 'email', title: 'Email', color: 'yellow' },
        { name: 'commit', title: 'Commit', color: 'cyan' },
        { name: 'files', title: 'Files', color: 'crimson' },
        { name: 'added', title: 'Lines +', color: 'green' },
        { name: 'deleted', title: 'Lines -', color: 'red' }
        // { name: 'lines', title: 'Total lines', color: 'yellow' },
        // { name: 'ratio', title: 'Del./Add.', color: 'white' }
      ]
    });
    const commits = await getCommits(projectDir, limit);
    for (const [commit, info] of commits) {
      const [user, email] = info.match(/(.*)\s+<(.*?)>/).slice(1);
      try {
        const stat = await getStatisticByUser(projectDir, email);
        Object.assign(stat, { user, email, commit });
        p.addRow(stat);
      } catch (ex) {
        console.log(ex.message);
      }
    }
    p.printTable();
  }
};

run();
