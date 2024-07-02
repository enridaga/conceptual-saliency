document.addEventListener('DOMContentLoaded', function () {
    const groupAFetch = fetch('https://raw.githubusercontent.com/mondoboia/conceptual-saliency/main/a_group_data.json');
    const groupBFetch = fetch('https://raw.githubusercontent.com/mondoboia/conceptual-saliency/main/b_group_data.json');

    let groupAData, groupBData, userId;

    Promise.all([groupAFetch, groupBFetch])
        .then(responses => Promise.all(responses.map(response => response.json())))
        .then(data => {
            groupAData = data[0];
            groupBData = data[1];
        })
        .catch(error => console.error('Error loading JSON data:', error));

    document.getElementById('start-survey').addEventListener('click', function () {
        const expertise = document.getElementById('expertise').value;
        let firstName = document.getElementById('first-name').value.trim();
        if (firstName === '') {
            alert('Please enter your first name.');
            return;
        }
        firstName = firstName.replace(/\s+/g, '-');
        const sessionId = generateUniqueId();
        userId = `${expertise}_${firstName}_${sessionId}`;
        document.getElementById('user-info').style.display = 'none';
        document.getElementById('group-selection').style.display = 'block';
    });

    document.getElementById('select-group-a').addEventListener('click', () => startSurvey('a', groupAData));
    document.getElementById('select-group-b').addEventListener('click', () => startSurvey('b', groupBData));

    function generateUniqueId() {
        return 'id-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 9);
    }

    function startSurvey(group, data) {
        document.getElementById('group-selection').style.display = 'none';
        document.getElementById(`survey-group-${group}`).style.display = 'block';

        const results = {
            group: group,
            data: [],
            userId: userId  // Include userId in results
        };

        let pairs = [];

        for (let method in data) {
            for (let chart in data[method]) {
                if (Array.isArray(data[method][chart])) {
                    data[method][chart].forEach(pair => {
                        pairs.push({ method, chart, pair });
                    });
                }
            }
        }

        let questionIndex = 0;

        function updateProgress() {
            const progressElement = document.getElementById(`progress-${group}`);
            progressElement.textContent = `Question ${questionIndex + 1} of ${pairs.length}`;
        }

        function createAttributeList(attributes) {
            const ul = document.createElement('ul');
            attributes.forEach(attribute => {
                const li = document.createElement('li');
                li.textContent = attribute;
                ul.appendChild(li);
            });
            return ul;
        }

        function createLikertScale(name, labels) {
            const scale = document.createElement('div');
            scale.className = 'likert-scale';

            labels.forEach((label, index) => {
                const inputLabel = document.createElement('label');
                inputLabel.innerHTML = `
                    <input type="radio" name="${name}" value="${index + 1}">
                    <br>
                    ${label}
                `;
                scale.appendChild(inputLabel);
            });

            return scale;
        }

        function getSaliencyValue(value, leftConcept, rightConcept) {
            switch (value) {
                case '1':
                    return { saliency: `strong ${leftConcept.saliency}`, conceptId: leftConcept.id };
                case '2':
                    return { saliency: `weak ${leftConcept.saliency}`, conceptId: leftConcept.id };
                case '3':
                    return { saliency: 'none', conceptId: 0 };
                case '4':
                    return { saliency: `weak ${rightConcept.saliency}`, conceptId: rightConcept.id };
                case '5':
                    return { saliency: `strong ${rightConcept.saliency}`, conceptId: rightConcept.id };
                default:
                    return { saliency: 'none', conceptId: 0 };
            }
        }

        function createQuestion(method, chart, pair) {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question';

            const leftAttributesList = createAttributeList(pair[0].attributes);
            const rightAttributesList = createAttributeList(pair[1].attributes);

            questionDiv.innerHTML = `
                <div class="attributes">
                    <div class="attribute-wrapper">
                        <strong>Left:</strong>
                        <div class="attribute-container"></div>
                        <p>Artworks: ${pair[0].artworks_num}</p>
                        <p>Percentage: ${pair[0].artworks_percentage}%</p>
                    </div>
                    <div class="attribute-wrapper">
                        <strong>Right:</strong>
                        <div class="attribute-container"></div>
                        <p>Artworks: ${pair[1].artworks_num}</p>
                        <p>Percentage: ${pair[1].artworks_percentage}%</p>
                    </div>
                </div>
                <div class="question-group">
                    <p>Which concept is more <b>representative</b>?</p>
                </div>
                <div class="likert-wrapper">
                    <div class="likert-scale">
                        ${createLikertScale('rep', ['Strongly Left', 'Left', 'Neutral', 'Right', 'Strongly Right']).outerHTML}
                    </div>
                </div>
                <div class="question-group">
                    <p>Which concept is more <b>prominent</b>?</p>
                </div>
                <div class="likert-wrapper">
                    <div class="likert-scale">
                        ${createLikertScale('pec', ['Strongly Left', 'Left', 'Neutral', 'Right', 'Strongly Right']).outerHTML}
                    </div>
                </div>
                <button id="next-button" disabled>Next</button>
            `;

            const leftContainer = questionDiv.querySelector('.attribute-wrapper .attribute-container');
            const rightContainer = questionDiv.querySelector('.attribute-wrapper + .attribute-wrapper .attribute-container');

            leftContainer.appendChild(leftAttributesList);
            rightContainer.appendChild(rightAttributesList);

            const repRadios = questionDiv.querySelectorAll('input[name="rep"]');
            const pecRadios = questionDiv.querySelectorAll('input[name="pec"]');
            const nextButton = questionDiv.querySelector('#next-button');

            function enableNextButton() {
                const repSelected = Array.from(repRadios).some(radio => radio.checked);
                const pecSelected = Array.from(pecRadios).some(radio => radio.checked);
                nextButton.disabled = !(repSelected && pecSelected);
            }

            repRadios.forEach(radio => radio.addEventListener('change', enableNextButton));
            pecRadios.forEach(radio => radio.addEventListener('change', enableNextButton));

            nextButton.addEventListener('click', () => {
                const repValue = questionDiv.querySelector('input[name="rep"]:checked').value;
                const pecValue = questionDiv.querySelector('input[name="pec"]:checked').value;

                const repSaliency = getSaliencyValue(repValue, pair[0], pair[1]);
                const pecSaliency = getSaliencyValue(pecValue, pair[0], pair[1]);

                const currentResult = {
                    questionNumber: questionIndex + 1,
                    timestamp: new Date().toISOString(),
                    group: group,
                    method: method,
                    chart: chart,
                    rep: repSaliency.conceptId,
                    repSaliency: repSaliency.saliency,
                    pec: pecSaliency.conceptId,
                    pecSaliency: pecSaliency.saliency,
                    userId: userId // Include userId
                };

                results.data.push(currentResult);

                // Send current result to server
                sendResult(currentResult);

                questionIndex++; // Increment after capturing the result
                nextQuestion();
            });

            return questionDiv;
        }

        function nextQuestion() {
            const container = document.getElementById(`group-${group}-questions`);
            if (container.firstChild) {
                container.removeChild(container.firstChild);
            }

            if (questionIndex >= pairs.length) {
                // Survey is complete
                document.getElementById(`survey-group-${group}`).style.display = 'none';
                document.getElementById('thank-you').style.display = 'block';
                console.log('Survey results:', results);
                return;
            }

            updateProgress();

            const { method, chart, pair } = pairs[questionIndex];
            const question = createQuestion(method, chart, pair);

            container.appendChild(question);
        }

        nextQuestion();
    }

    function sendResult(result) {
        console.log('Sending result:', JSON.stringify(result));
        const scriptURL = 'https://script.google.com/macros/s/AKfycbxbjZkZioMUiCXIHYMdIjFYvuWOotBzUqp64LoHZdoYtd015LMJKXCsQVmCxpjP6stIMw/exec';
        fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(result)
        })
            .then(response => console.log('Success:', response))
            .catch(error => console.error('Error:', error));
    }
});