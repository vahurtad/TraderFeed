let inquirer = require('inquirer');

function processAnswers(answers) {
  console.log('And your answers are:', answers);
}
function validateAge(age) {

  const reg = /^\d+$/;
  return reg.test(age) || 'Age should be a number!';
}

function validateName(name) {
        return name !== '';
    }

let ageQ = {
      message: "What's your age?",
      type: 'input',
      name: 'age',
      validate: validateAge
  };
let feedbackQ = {
    message: 'How would you rate us?',
    type: 'rawlist',
    name: 'feedback',
    choices: ['Awesome', 'Good', 'Okay', 'You suck' ]
};
let treatQ = {
  when : ( answers ) => {
    return answers.feedback === 'Awesome';
  },
  message: 'Thank you soo much! You are Awesome too...',
  type: 'list',
  name: 'treat',
  choices: ['Magnet&Stickers','T-Shirt', 'Mug'],

  default: 'T-Shirt'
};

let questions = [
{
    message: "What's your first name?",
    type: 'input',
    name: 'firstName',
    validate: validateName
},{
    message: "What's your last name?",
    type: 'input',
    name: 'lastName',
    validate: validateName
},ageQ,feedbackQ,treatQ

];
inquirer.prompt(questions).then(processAnswers);
