# Contributing to uniPay

Thank you for your interest in contributing to **uniPay**! We appreciate contributions from the community to help improve this project. Please follow the guidelines outlined below to ensure smooth collaboration and maintain code quality.

## Table of Contents

1. [Getting Started](#getting-started)
2. [How to Contribute](#how-to-contribute)
   - [Reporting Issues](#reporting-issues)
   - [Suggesting Enhancements](#suggesting-enhancements)
   - [Submitting a Pull Request](#submitting-a-pull-request)
3. [Branching and Commit Standards](#branching-and-commit-standards)
4. [Code Guidelines](#code-guidelines)
5. [Testing](#testing)
6. [Pull Request Process](#pull-request-process)
7. [Code of Conduct](#code-of-conduct)
8. [License](#license)
9. [Contact Information](#contact-information)

## Getting Started

1. **Fork the Repository**: Click the “Fork” button at the top-right corner of the repository to create your copy.
2. **Clone Your Fork**: Clone your forked repository to your local machine using the command:
   ```bash
   git clone https://github.com/pushparaj13811/unipay.git
   ```
3. **Install Dependencies**: Navigate to the project folder and install the necessary dependencies:
   ```bash
   cd <sdk-folder>
   npm install # For JavaScript SDK
   composer install # For PHP SDK
   pip install -r requirements.txt # For Python SDK
   ```

## How to Contribute

### Reporting Issues

If you encounter any bugs, glitches, or have feature requests, please open an issue and include:
- A clear and descriptive title.
- Detailed description of the problem.
- Steps to reproduce the issue.
- Any relevant error messages, logs, or screenshots.

### Suggesting Enhancements

To suggest improvements or new features, open an issue with:
- A descriptive title.
- Explanation of the benefit and impact of the proposed change.
- An outline of how the enhancement can be implemented.

### Submitting a Pull Request

Follow these steps to submit a PR:

1. **Create a New Branch**: Create a feature or issue branch.
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make Changes**: Implement your changes in the respective SDK folder and ensure they follow the coding guidelines.
3. **Commit Changes**: Write clear and descriptive commit messages (following [Conventional Commits](https://www.conventionalcommits.org)):
   ```bash
   git commit -m "feat: add new payment gateway integration"
   ```
4. **Push Changes**: Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request**: Open a PR against the `main` branch and provide a detailed description of your changes.

## Branching and Commit Standards

- **Branch Names**: Use descriptive branch names:
  - For new features: `feature/feature-name`
  - For bug fixes: `fix/issue-number`
- **Commit Messages**: Use [Conventional Commits](https://www.conventionalcommits.org):
  - `feat: new feature description`
  - `fix: bug description`
  - `docs: update documentation`
  - `style: code style changes (e.g., formatting)`
  - `test: add or fix tests`
  - `chore: other maintenance tasks`

## Code Guidelines

- **Code Style**: Follow specific coding standards for each SDK:
  - JavaScript: [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/)
  - PHP: [PSR Standards](https://www.php-fig.org/psr/)
  - Python: [PEP 8](https://www.python.org/dev/peps/pep-0008/)
- Use meaningful variable and function names.
- Keep code modular and avoid unnecessary complexity.
- Ensure consistency in indentation, spacing, and overall code structure.
  
## Testing

All code changes must include corresponding tests. Ensure you:
- Write unit tests for new features and bug fixes.
- Run existing tests to ensure nothing breaks.
- You can run tests locally by executing:
   ```bash
   npm test # For JavaScript SDK
   phpunit # For PHP SDK
   pytest # For Python SDK
   ```

## Pull Request Process

1. **Open a PR**: Once your changes are ready, submit a PR targeting the `main` branch.
2. **PR Requirements**:
   - Ensure PR description clearly explains what was done.
   - Reference any related issues (e.g., `Fixes #123`).
   - Ensure all checks (CI/CD, tests, linting) pass before merging.
3. **Code Review**: All PRs must be reviewed by at least one maintainer. After approval, it will be merged.

## Code of Conduct

We expect all contributors to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, inclusive, and collaborative when contributing to the project.

## License

By contributing to **uniPay**, you agree that your contributions will be licensed under the terms of the [uniPay License](LICENSE).

## Contact Information

For any questions or discussions regarding contributions, contact Hompushparaj Mehta at [pushparajmehta002@gmail.com](mailto:pushparajmehta002@gmail.com).

---

Thank you for your contributions! Every improvement helps make **uniPay** better for the community.
