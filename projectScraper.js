const puppeteer = require('puppeteer');
const { JSDOM } = require( "jsdom" );
const baseUrl = 'https://www.templetonworldcharity.org'
let urls = [
    {
        name: 'Templeton World',
        url: baseUrl + '/projects-database',
        website: 'home'
    }
];
let allLinks = [];
let allProjectData = [];

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 926 });
    let currentPage = 1;

    for (var i = 0; i < urls.length; i++) {
        var url = urls[i];
        await page.goto(url.url);
        let currentBodyHTML = '';
        let doneParsing = false;
        while (!doneParsing) {
            currentBodyHTML = await page.evaluate(() => document.body.innerHTML);
            let currentLinks = getCurrentPageLinks(currentBodyHTML);
            allLinks = allLinks.concat(currentLinks);
            if (hasNextpage(currentBodyHTML)) {
                await page.click('li.next a');
            } else {
                doneParsing = true;
            }
            currentPage = currentPage + 1;
            console.log(currentPage);
        }
    }

    for (var j = 0; j < allLinks.length; j++) {
        let currentUrl = baseUrl + allLinks[j];
        await page.goto(currentUrl);
        let bodyHTML = await page.evaluate(() => document.body.innerHTML);
        allProjectData.push(getProjectData(bodyHTML, currentUrl));
        console.log('Processing project ' + j + ' of ' + allLinks.length);
    }

    writeProjectsCsv(allProjectData);
    
    await page.close();
    await browser.close();
})();

function getProjectData(bodyHTML, url) {
    const { window } = new JSDOM( bodyHTML );
    const $ = require( "jquery" )( window );
    let projectData = {};
    projectData.summary = $('.project__summary p').text();
    projectData.url = url;

    let projectInfoItems = $('.project__info-item');
    for (let i = 0; i < projectInfoItems.length; i++) {
        let currentItem = projectInfoItems[i];
        let text = $(currentItem).text();
        let textSplit = text.split(":");
        if (textSplit.length >= 2) {
            projectData[textSplit[0]] = textSplit[1];
        }
    }

    return projectData;
}

function getCurrentPageLinks(bodyHTML) {
    const { window } = new JSDOM( bodyHTML );
    const $ = require( "jquery" )( window );

    let projectLinks = $('.project-result a');
    let allProjectHrefs = [];
    for(var i = 0; i < projectLinks.length; i++) {
        let currentLink = projectLinks[i];
        let link = currentLink.href;
        if (link) {
            allProjectHrefs.push(link);
        }
    }
    return allProjectHrefs;
}

function hasNextpage(bodyHTML) {
    const { window } = new JSDOM( bodyHTML );
    const $ = require( "jquery" )( window );

    return $('li.next.disabled').length === 0;
}


function writeProjectsCsv(allProjectData) {
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;
    const csvWriter = createCsvWriter({
        path: 'projects.csv',
        header: [
            {id: 'Amount Awarded', title: 'Amount Awarded'},
            {id: 'Core Funding Area', title: 'Core Funding Area'},
            {id: 'Initiative', title: 'Initiative'},
            {id: 'Project Duration', title: 'Project Duration'},
            {id: 'Region', title: 'Region'},
            {id: 'summary', title: 'summary'},
            {id: 'TWCF Number', title: 'TWCF Number'},
            {id: 'url', title: 'url'},
        ]
    });
    
    csvWriter.writeRecords(allProjectData)       // returns a promise
        .then(() => {
            console.log('...Done');
        });

}
