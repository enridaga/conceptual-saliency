document.addEventListener('DOMContentLoaded', function () {
    const groupAFetch = fetch('https://raw.githubusercontent.com/mondoboia/conceptual-saliency/main/a_group_data.json');
    const groupBFetch = fetch('https://raw.githubusercontent.com/mondoboia/conceptual-saliency/main/b_group_data.json');

    let groupAData, groupBData;

    Promise.all([groupAFetch, groupBFetch])
        .then(responses => Promise.all(responses.map(response => response.json())))
        .then(data => {
            groupAData = data[0];
            groupBData = data[1];
        })
        .catch(error => console.error('Error loading JSON data:', error));

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
            data: []
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
            // progressElement.textContent = `Question ${questionIndex + 1} of 10`;
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
                    </div>
                    <div class="attribute-wrapper">
                        <strong>Right:</strong>
                        <div class="attribute-container"></div>
                    </div>
                </div>
                <div class="question-group">
                    <p>Which concept is more <b>representative</b>?</p>
                    <label>
                        <input type="radio" name="rep" value="left"> Left
                    </label>
                    <label>
                        <input type="radio" name="rep" value="right"> Right
                    </label>
                </div>
                <div class="question-group">
                    <p>Which concept is more <b>peculiar</b>?</p>
                    <label>
                        <input type="radio" name="pec" value="left"> Left
                    </label>
                    <label>
                        <input type="radio" name="pec" value="right"> Right
                    </label>
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

                const selectedRep = repValue === 'left' ? pair[0] : pair[1];
                const selectedPec = pecValue === 'left' ? pair[0] : pair[1];

                results.data.push({
                    questionNumber: questionIndex,
                    timestamp: new Date().toISOString(),
                    id: generateUniqueId(),
                    group: group,
                    method: method,
                    chart: chart,
                    rep: selectedRep.id,
                    repSaliency: selectedRep.saliency,
                    pec: selectedPec.id,
                    pecSaliency: selectedPec.saliency
                });

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
                console.log('Survey results:', results); // Log the results for testing
                sendResults(results); // Send the results to the server for testing
                return;
            }

            // if (questionIndex >= 10 || questionIndex >= pairs.length) {
            //     // Survey is complete after 10 questions
            //     document.getElementById(`survey-group-${group}`).style.display = 'none';
            //     document.getElementById('thank-you').style.display = 'block';
            //     console.log('Survey results:', results); // Log the results for testing
            //     sendResults(results); // Send the results to the server for testing
            //     return;
            // }

            updateProgress();

            const { method, chart, pair } = pairs[questionIndex];
            const question = createQuestion(method, chart, pair);

            container.appendChild(question);
            questionIndex++;
        }

        nextQuestion();
    }


    function sendResults(results) {
        const scriptURL = 'https://script.google.com/macros/s/AKfycbxYackKUPibBYz3mGFZ4JNZYGHFNzU3k93pcgh6dLfgORg0I_RGmzVsrvjeRGfE4oIkmQ/exec';
        fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ results: results })
        })
            .then(response => console.log('Success:', response))
            .catch(error => console.error('Error:', error));
    }
});