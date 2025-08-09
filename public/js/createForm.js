document.addEventListener('DOMContentLoaded', function () {
  let questionCount = 1 // Initialize question count

  const addQuestionBtn = document.getElementById('addQuestionBtn')
  const questionsContainer = document.getElementById('questionsContainer')

  addQuestionBtn.addEventListener('click', function () {
    questionCount++
    const newQuestionHTML = `
            <div class="mb-3 question" id="question${questionCount}">
                <label for="questionText${questionCount}" class="form-label">Question Text</label>
                <input type="text" class="form-control" id="questionText${questionCount}" name="questions[${questionCount - 1}][questionText]" required>
                <label for="questionType${questionCount}" class="form-label">Question Type</label>
                <select class="form-select" id="questionType${questionCount}" name="questions[${questionCount - 1}][questionType]" required>
                    <option value="text">Text</option>
                    <option value="multipleChoice">Multiple Choice</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="rating">Rating</option>
                </select>
                <button type="button" class="btn btn-danger removeQuestionBtn" onclick="removeQuestion(${questionCount})">Remove Question</button>
            </div>
        `
    questionsContainer.insertAdjacentHTML('beforeend', newQuestionHTML)
  })

  window.removeQuestion = function (questionNumber) {
    const questionToRemove = document.getElementById(`question${questionNumber}`)
    if (questionToRemove) {
      questionsContainer.removeChild(questionToRemove)
      updateQuestionIndices()
    }
  }

  function updateQuestionIndices () {
    let currentQuestionIndex = 0
    document.querySelectorAll('.question').forEach(questionDiv => {
      currentQuestionIndex++
      questionDiv.id = `question${currentQuestionIndex}`
      questionDiv.querySelector('label[for^="questionText"]').setAttribute('for', `questionText${currentQuestionIndex}`)
      questionDiv.querySelector('input[id^="questionText"]').id = `questionText${currentQuestionIndex}`
      questionDiv.querySelector('input[id^="questionText"]').name = `questions[${currentQuestionIndex - 1}][questionText]`
      questionDiv.querySelector('label[for^="questionType"]').setAttribute('for', `questionType${currentQuestionIndex}`)
      questionDiv.querySelector('select[id^="questionType"]').id = `questionType${currentQuestionIndex}`
      questionDiv.querySelector('select[id^="questionType"]').name = `questions[${currentQuestionIndex - 1}][questionType]`
      questionDiv.querySelector('button[onclick^="removeQuestion"]').setAttribute('onclick', `removeQuestion(${currentQuestionIndex})`)
    })
    questionCount = currentQuestionIndex
    console.log(`Updated question indices. Total questions now: ${questionCount}.`)
  }

  // Update the Add Question button style with a class
  addQuestionBtn.classList.add('btn-primary')

  // Ensure the Submit button in the form has a class for styling
  const submitBtn = document.querySelector('form#createForm button[type="submit"]')
  if (submitBtn) {
    submitBtn.classList.add('btn-success')
  }
})
