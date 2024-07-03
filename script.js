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
                    return { saliency: 'equal', conceptId: 0 };
                case '4':
                    return { saliency: `weak ${rightConcept.saliency}`, conceptId: rightConcept.id };
                case '5':
                    return { saliency: `strong ${rightConcept.saliency}`, conceptId: rightConcept.id };
                default:
                    return { saliency: 'equal', conceptId: 0 };
            }
        }

        function createQuestion(method, chart, pair) {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question';

            const leftAttributesList = createAttributeList(pair[0].attributes);
            const rightAttributesList = createAttributeList(pair[1].attributes);

            const attributesDiv = document.createElement('div');
            attributesDiv.className = 'attributes';

            const leftWrapper = document.createElement('div');
            leftWrapper.className = 'attribute-wrapper';
            const leftStrong = document.createElement('strong');
            leftStrong.textContent = 'Left:';
            const leftContainer = document.createElement('div');
            leftContainer.className = 'attribute-container';
            leftContainer.appendChild(leftAttributesList);
            leftWrapper.appendChild(leftStrong);
            leftWrapper.appendChild(leftContainer);
            leftWrapper.innerHTML += `
                <p>Artworks: ${pair[0].artworks_num}</p>
                <p>Percentage: ${pair[0].artworks_percentage}%</p>
            `;

            const pieChartContainer = document.createElement('div');
            pieChartContainer.className = 'pie-chart-container';
            const pieChartCanvas = document.createElement('canvas');
            pieChartCanvas.id = `pieChart-${questionIndex}`;
            pieChartContainer.appendChild(pieChartCanvas);

            const rightWrapper = document.createElement('div');
            rightWrapper.className = 'attribute-wrapper';
            const rightStrong = document.createElement('strong');
            rightStrong.textContent = 'Right:';
            const rightContainer = document.createElement('div');
            rightContainer.className = 'attribute-container';
            rightContainer.appendChild(rightAttributesList);
            rightWrapper.appendChild(rightStrong);
            rightWrapper.appendChild(rightContainer);
            rightWrapper.innerHTML += `
                <p>Artworks: ${pair[1].artworks_num}</p>
                <p>Percentage: ${pair[1].artworks_percentage}%</p>
            `;

            attributesDiv.appendChild(leftWrapper);
            attributesDiv.appendChild(pieChartContainer);
            attributesDiv.appendChild(rightWrapper);

            questionDiv.appendChild(attributesDiv);

            // Create pie chart
            const pieCtx = pieChartCanvas.getContext('2d');
            const totalPercentage = pair[0].artworks_percentage + pair[1].artworks_percentage;
            const remainingPercentage = 100 - totalPercentage;

            new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: ['Left', 'Right', 'Remaining'],
                    datasets: [{
                        data: [pair[0].artworks_percentage, pair[1].artworks_percentage, remainingPercentage],
                        backgroundColor: ['#6c5ce7', '#00cec9', '#d3d3d3']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    rotation: -20 * Math.PI,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });

            const questionGroupRep = document.createElement('div');
            questionGroupRep.className = 'question-group';
            questionGroupRep.innerHTML = '<p>Which cluster is more <b>representative</b>?</p>';
            const definitionParagraphRep = document.createElement('p');
            definitionParagraphRep.className = 'definition';
            definitionParagraphRep.textContent = 'Exemplifies a wider group, class, or kind; (of an individual) typical; (of a sample or selection) balanced.';
            questionGroupRep.appendChild(definitionParagraphRep);
            const likertWrapperRep = document.createElement('div');
            likertWrapperRep.className = 'likert-wrapper';
            likertWrapperRep.appendChild(createLikertScale('rep', ['Strongly Left', 'Left', 'Equally', 'Right', 'Strongly Right']));
            questionDiv.appendChild(questionGroupRep);
            questionDiv.appendChild(likertWrapperRep);

            const questionGroupPro = document.createElement('div');
            questionGroupPro.className = 'question-group';
            questionGroupPro.innerHTML = '<p>Which cluster is more <b>prominent</b>?</p>';
            const definitionParagraphPro = document.createElement('p');
            definitionParagraphPro.className = 'definition';
            definitionParagraphPro.textContent = 'Stands out so as to catch the attention; notable; distinguished above others of the same kind; (of a person) well-known, important.';
            questionGroupPro.appendChild(definitionParagraphPro);
            const likertWrapperPro = document.createElement('div');
            likertWrapperPro.className = 'likert-wrapper';
            likertWrapperPro.appendChild(createLikertScale('pro', ['Strongly Left', 'Left', 'Equally', 'Right', 'Strongly Right']));
            questionDiv.appendChild(questionGroupPro);
            questionDiv.appendChild(likertWrapperPro);

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-container';
            const nextButton = document.createElement('button');
            nextButton.id = 'next-button';
            nextButton.textContent = 'Next';
            nextButton.disabled = true;
            buttonContainer.appendChild(nextButton);
            questionDiv.appendChild(buttonContainer);

            const repRadios = questionDiv.querySelectorAll('input[name="rep"]');
            const proRadios = questionDiv.querySelectorAll('input[name="pro"]');

            function enableNextButton() {
                const repSelected = Array.from(repRadios).some(radio => radio.checked);
                const proSelected = Array.from(proRadios).some(radio => radio.checked);
                nextButton.disabled = !(repSelected && proSelected);
            }

            repRadios.forEach(radio => radio.addEventListener('change', enableNextButton));
            proRadios.forEach(radio => radio.addEventListener('change', enableNextButton));

            nextButton.addEventListener('click', () => {
                const repValue = questionDiv.querySelector('input[name="rep"]:checked').value;
                const proValue = questionDiv.querySelector('input[name="pro"]:checked').value;

                const repSaliency = getSaliencyValue(repValue, pair[0], pair[1]);
                const proSaliency = getSaliencyValue(proValue, pair[0], pair[1]);

                const currentResult = {
                    questionNumber: questionIndex + 1,
                    timestamp: new Date().toISOString(),
                    group: group,
                    method: method,
                    chart: chart,
                    rep: repSaliency.conceptId,
                    repSaliency: repSaliency.saliency,
                    pro: proSaliency.conceptId,
                    proSaliency: proSaliency.saliency,
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

            if (question) {
                container.appendChild(question);
            }
        }

        nextQuestion();
    }

    function sendResult(result) {
        console.log('Sending result:', JSON.stringify(result));
        const scriptURL = 'https://script.google.com/macros/s/AKfycbxIh_sY0gDB3O39Ci7TYcpWK_3mJqSVPkz0ARk_ASY6uwqZDwF6Hsr1dBKOA2NXqYrneg/exec';
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