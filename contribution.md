# Contributing to uniPay

Thank you for your interest in contributing to **uniPay**! We welcome contributions from the community to help improve this project. This document outlines how you can contribute, our guidelines, and the specific requirements for each SDK.

## Table of Contents

1. [Getting Started](#getting-started)
2. [How to Contribute](#how-to-contribute)
   - [Reporting Issues](#reporting-issues)
   - [Suggesting Enhancements](#suggesting-enhancements)
   - [Submitting a Pull Request](#submitting-a-pull-request)
3. [SDK-Specific Contribution](#sdk-specific-contribution)
   - [JavaScript SDK](#javascript-sdk)
   - [PHP SDK](#php-sdk)
   - [Python SDK](#python-sdk)
4. [Coding Guidelines](#coding-guidelines)
5. [Code of Conduct](#code-of-conduct)
6. [License](#license)
7. [Contact Information](#contact-information)

## Getting Started

1. **Fork the Repository**: Click the “Fork” button at the top-right corner of the repository to create your copy.
2. **Clone Your Fork**: Use the following command to clone your forked repository to your local machine:
   ```bash
   git clone https://github.com/pushparaj13811/unipay.git
   ```
3. **Set Up the Project**: Follow the setup instructions in the respective SDK README files:
   - [JavaScript SDK](js-sdk/README.md)
   - [PHP SDK](php-sdk/README.md)
   - [Python SDK](python-sdk/README.md)

4. **Install Dependencies**: Navigate to the SDK folder you want to work on and install the required dependencies:
   - For JavaScript SDK:
     ```bash
     cd js-sdk
     npm install
     ```
   - For PHP SDK:
     ```bash
     cd php-sdk
     composer install
     ```
   - For Python SDK:
     ```bash
     cd python-sdk
     pip install -r requirements.txt
     ```

## How to Contribute

### Reporting Issues

If you encounter any bugs or issues, please open an issue in the repository. Be sure to include:
- A clear and descriptive title for the issue.
- A detailed description of the problem, including the context and the expected vs. actual behavior.
- Steps to reproduce the issue, including code snippets if applicable.
- Any relevant error messages or screenshots.

### Suggesting Enhancements

We appreciate suggestions for new features or improvements. If you have an idea:
- Open an issue with a clear title and description.
- Explain the benefit of the proposed enhancement and how it can improve the user experience.
- If possible, include an outline of how you would implement the feature.

### Submitting a Pull Request

To contribute code, please follow these steps:

1. **Create a New Branch**: Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make Your Changes**: Implement your changes in the respective SDK folder (JavaScript, PHP, or Python) and ensure they follow the coding guidelines outlined below.
3. **Test Your Changes**: Make sure to run any existing tests and write new tests for your changes to verify functionality.
4. **Commit Your Changes**: Write clear and concise commit messages:
   ```bash
   git commit -m "Add feature: Description of your feature"
   ```
5. **Push Your Changes**: Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request**: Go to the original repository and click on the “New Pull Request” button. Provide a descriptive title and comments about your changes. Make sure to indicate the SDK you’re contributing to and any relevant issues your PR addresses.

## SDK-Specific Contribution

Please ensure you follow the appropriate README and guidelines for the specific SDK you are contributing to:

### JavaScript SDK

- **Folder**: `js-sdk`
- **README**: [JavaScript SDK README](js-sdk/README.md)
- **Guidelines**:
  - Ensure all new features are documented in the README file.
  - Follow the established code style (e.g., ES6 syntax, use of Promises/async-await).

### PHP SDK

- **Folder**: `php-sdk`
- **README**: [PHP SDK README](php-sdk/README.md)
- **Guidelines**:
  - Follow PSR standards for PHP coding.
  - Ensure that all changes are tested, and PHPUnit tests are included.

### Python SDK

- **Folder**: `python-sdk`
- **README**: [Python SDK README](python-sdk/README.md)
- **Guidelines**:
  - Follow PEP 8 standards for Python coding.
  - Ensure that all changes are tested, and include unit tests with `unittest` or `pytest`.

## Coding Guidelines

To maintain a clean and consistent codebase, please adhere to the following guidelines:
- Follow consistent naming conventions (e.g., camelCase for JavaScript, snake_case for Python).
- Write clean, readable code with appropriate comments where necessary.
- Ensure your code passes existing tests and consider adding new tests for your changes.
- Maintain the existing coding style and structure used in the project.
- Avoid adding unnecessary dependencies to keep the SDK lightweight.

## Code of Conduct

We expect all contributors to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please be respectful and considerate in all interactions, whether in discussions or code reviews.

## License

By contributing to **uniPay**, you agree that your contributions will be licensed under the terms of the [UniPay License](LICENSE.md).

## Contact Information

For any questions or discussions regarding contributions, please contact Hompushparaj Mehta at [pushparajmehta002@gmail.com](mailto:pushparajmehta002@gmail.com).

Thank you for your interest in contributing to **uniPay**! Your contributions help make this project better for everyone.
