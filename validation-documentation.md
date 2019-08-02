## TODOs from 2019/08/01 meeting
Zac to:
1. Investigate if SwishUI code can be entirely client-side.

Ron to:
1. Change Swish logic to accept assignment description from JSON QA file.
   - This will be done in the [Swish repo](https://github.com/ron-t/Swish/tree/master/SampleCourseOfflineJSON)
   - [ ] Changes to the JSON QA file format.
   - [ ] Changes to the quiz creation logic: where the description text is pulled from.
   - (Private change) individualised URL generation logic.

2. Add column to CSV for "description". This will mean:
- [ ] CSV validation rules to match: total column count now 2 + (numQuestions * 2).  

After this Zac can:

3. Ensure CSV/xls to JSON conversion matches the [expected JSON QA format](https://github.com/ron-t/Swish/blob/master/SampleCourseOfflineJSON/inOutFiles/SampleFilesQA.json).

4. "Module-ise" Swish logic.

---

## Q&A file
### Q&A file format
Sample JSON file is here: https://github.com/ron-t/Swish/blob/master/SampleCourseOfflineJSON/inOutFiles/SampleFilesQA.json
- The same fields/data need to be provided, so a CSV version will look something like:

student id number|Q1 question|Q1 answer|Q2 question|Q2 answer|Qn question|Qn answer|
-----------------|-----------|---------|-----------|---------|-----------|---------|
1111111|What is X?|abc|What is Y?|123|What is Z?|11
2222222|What is X?|def|What is Y?|456|What is Z?|22
3333333|What is X?|ghi|What is Y?|789|What is Z?|33

- All values are text.
- One row per student.
- Two columns per question. Total number of columns is: 1 + (numQuestions * 2)


### Q&A file processing and validation
- [ ] Determine file size limit.
- [ ] Provide template CSV/Excel file.
- [ ] Write code to convert CSV to JSON to be processble by [Swish logic](https://github.com/ron-t/Swish/tree/master/SampleCourseOfflineJSON) in [Create.js](https://github.com/ron-t/Swish/blob/master/SampleCourseOfflineJSON/Create.js) and [util.js](https://github.com/ron-t/Swish/blob/master/SampleCourseOfflineJSON/util.js)

🤔 TODO: validation rules. E.g. an answer column exists for every question column; no empty cells (including empty string); ...



## Form fields validation
### Step one (field upload)
- [ ] Replace the "If you're not sure how to make this file..." part with a link to an example CSV file.
- [ ] Include advice: if an Excel file is uploaded, which sheet is used etc.

### Token
- [x] Must be provided.
- [ ] Link to page with guide on how to generate a token.

### Domain
- [ ] Only allow 3 selectable options. Option 2 is default.
1. https://canvas.auckland.ac.nz
2. https://auckland.beta.instructure.com
3. https://auckland.test.instructure.com

### Course ID
- [ ] Must be numeric.
- [ ] (?) Must be valid. Not sure if this is worth checking.
- Logic would be something like an async GET call to the [Canvas API](https://canvas.auckland.ac.nz/doc/api/courses.html#method.courses.show) using the provided Token.
- Endpoint: /api/v1/courses/:id 
- Invalid if "unauthorised error" returned.
- Valid if course data returned.

### Assignment title prefix
- [x] Must be provided.
- [ ] (?) Impose character limit.

### Number of questions
- [x] Must be integer.
- [ ] (?) Should match the number of questions and answers provided in the uploaded file. Perhaps this could be automatically populated.

### Total marks
- [x] Must be numeric.

### Lock date time
- [x] Must be datetime.
- [ ] Date format should be DD/MM/YYYY instead of MM/DD/YYYY.
- [ ] (?) Include advice about timezone.
- [ ] Explain that lock date will also be the due date.
- [ ] (?) Consider allowing a due date separate to lock date.

### Number of attempts
- [x] Must be numeric.
- [x] Leave blank for unlimited
- Note: the Canvas API uses -1 for unlimited attempts.


## Submission
🤔 TODO: back-end validation rules


## Other issues
- [ ] Remove "Derive marks per Q" field. Force marks to be evenly distributed across questions.
- [ ] Change copyright ownership to Zac and Ron.
- [ ] Consistent capitalisation or naming scheme for field names.
- [ ] Add privacy policy.
- [ ] Add link to source code.
