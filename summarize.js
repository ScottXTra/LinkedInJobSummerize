// ==UserScript==
// @name         LinkedIn Job Description Summarizer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Summarize job descriptions using GPT-3
// @author       Scott
// @match        https://www.linkedin.com/jobs/search/*
// @grant        GM_xmlhttpRequest
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function () {
    'use strict';

    function getJobDescription() {
        return $('.jobs-description__container').text().trim();
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    function displayLoadingMessage() {
        let loadingBox = document.querySelector('.loading-box');
        if (!loadingBox) {
            loadingBox = document.createElement('div');
            loadingBox.className = 'loading-box';
            loadingBox.style.marginTop = '10px';
            loadingBox.style.padding = '20px';
            loadingBox.style.backgroundColor = '#f3f6f8';
            loadingBox.style.border = '1px solid #d9dee4';
            loadingBox.style.borderRadius = '6px';
            loadingBox.style.fontSize = '14px';
            loadingBox.style.lineHeight = '1.5';
            loadingBox.style.color = '#3c3f45';

            const container = document.querySelector('.jobs-unified-top-card__container--two-pane');
            container.parentNode.insertBefore(loadingBox, container.nextSibling);
        }

        loadingBox.innerHTML = `
        <span>Generating summary of job... </span>
        <span class="loading-symbol">&#x231B;</span>
    `;
    }
    function displaySummary(summary) {
        let summaryBox = document.querySelector('.summary-box');
        let loadingBox = document.querySelector('.loading-box');

        if (loadingBox) {
            loadingBox.remove();
        }

        if (!summaryBox) {
            summaryBox = document.createElement('div');
            summaryBox.className = 'summary-box';
            summaryBox.style.marginTop = '10px';
            summaryBox.style.padding = '20px';
            summaryBox.style.backgroundColor = '#f3f6f8';
            summaryBox.style.border = '1px solid #d9dee4';
            summaryBox.style.borderRadius = '6px';
            summaryBox.style.fontSize = '14px';
            summaryBox.style.lineHeight = '1.5';
            summaryBox.style.color = '#3c3f45';

            const container = document.querySelector('.jobs-unified-top-card__container--two-pane');
            container.parentNode.insertBefore(summaryBox, container.nextSibling);
        }
        summaryBox.innerHTML = `
        <h3 style="margin-bottom: 10px;">📝 Job Summary:</h3>
        <p>${summary}</p>
    `;
    }


    function callGpt3(jobDescription) {
        const messages = [
            {"role": "system", "content": "You are an assistant that summarizes and explains a job discription and lists the requirements. You remove all of the altruistic junk that hiring managers add."},
            {"role": "user", "content": `Here is the description of the job:\n\n${jobDescription}. `}
        ];

        const data = {
            'model': 'gpt-3.5-turbo-0301',
            'messages': messages,
            'temperature': 1,
        };

        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://api.openai.com/v1/chat/completions',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer GPT-API-TOKEN',
            },
            data: JSON.stringify(data),
            onload: function (response) {
                if (response.status === 200) {
                    const result = JSON.parse(response.responseText);
                    const summary = result.choices[0].message.content.trim();
                    displaySummary(summary);
                    console.log('Summary:', summary);
                } else {
                    console.error(`Error ${response.status}: ${response.responseText}`);
                }
            },
        });
    }

    function observeJobDescription() {
        const container = document.querySelector('.jobs-description__container');
        if (!container) {
            setTimeout(observeJobDescription, 500);
            return;
        }

        const printAndSummarizeJobDescription = debounce(() => {
            const jobDescription = getJobDescription();
            console.log('Job Description:', jobDescription);

            let summaryBox = document.querySelector('.summary-box');
            if (summaryBox) {
                summaryBox.remove();
            }

            displayLoadingMessage();
            callGpt3(jobDescription, displaySummary);
        }, 500);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    printAndSummarizeJobDescription();
                }
            });
        });

        observer.observe(container, { childList: true, subtree: true });
    }

    $(document).ready(observeJobDescription);
})();
