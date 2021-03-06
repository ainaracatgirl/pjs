#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

function copyFolderSync(from, to) {
    fs.mkdirSync(to);
    fs.readdirSync(from).forEach(element => {
        if (element.indexOf('node_modules') != -1) return;
        if (element.indexOf(process.argv[2]) != -1) return;
        if (element.indexOf('create.js') != -1) return;
        if (element.indexOf('package-lock.json') != -1) return;
        if (fs.lstatSync(path.join(from, element)).isFile()) {
            fs.copyFileSync(path.join(from, element), path.join(to, element));
        } else {
            copyFolderSync(path.join(from, element), path.join(to, element));
        }
    });
}

function log() {
    let argstr = '';
    for (const arg of arguments) {
        argstr += arg
            .replace(/(\$RES)/g, '\x1b[0m')
            .replace(/(\$COL)/g, '\x1b[0m\x1b[36m')
            .replace(/(\$UND)/g, '\x1b[4m')
             + ' ';
    }
    console.log('\x1b[36m[pjs]', argstr, '\x1b[0m')
}

const start = Date.now();
log(`Creating $RES$UND${process.argv[2]}$COL in $RES$UND${__dirname}$RES`);

const installpath = path.dirname(process.argv[1]);
const fspath = `${__dirname}/${process.argv[2]}/`;
log('Copying files...');
copyFolderSync(installpath, fspath);

log('Setting up $RES$UNDpackage.json$COL...');
const pkgcontent = JSON.parse(fs.readFileSync(fspath + 'package.json'));
pkgcontent.name = process.argv[2];
pkgcontent.description = process.argv[2];
delete pkgcontent.author;
delete pkgcontent.license;
delete pkgcontent.bin;
fs.writeFileSync(fspath + 'package.json', JSON.stringify(pkgcontent, undefined, 4));

log('Running $RES$UNDnpm install$COL...');
child_process.execSync('npm install', {
    cwd: fspath
});


log(`Finished in $RES$UND${Date.now() - start}ms$RES`);
console.log('');
console.log('');
console.log('');
log(`Run $RES$UNDnpm run dev$RES to start the development server`);