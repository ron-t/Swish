## Q&A file
### Q&A file format
Sample JSON file is here: https://github.com/ron-t/Swish/blob/master/SampleCourseOfflineJSON/inOutFiles/SampleFilesQA.json
- The same fields/data need to be provided, so a CSV version will look something like:

student id number|description|Q1 question|Q1 answer|Q2 question|Q2 answer|Qn question|Qn answer|
-----------------|-----------|-----------|---------|-----------|---------|-----------|---------|
1111111|Assignment for Zac|What is X?|abc|What is Y?|123|What is Z?|11
2222222|Assignment for Ron|What is X?|def|What is Y?|456|What is Z?|22
3333333|Assignment for Steve|What is X?|ghi|What is Y?|789|What is Z?|33

- All values are text.
- One row per student.
- Two columns per question. Total number of columns is: 2 + (numQuestions * 2)


### Q&A file processing and validation
- [x] Determine file size limit.
  - Some investigation suggests upload filesize is around ~30MB, but that there is no clear documented limit: https://stackoverflow.com/a/8032280/3902950. Therefore, I have set the client-side limit to 15MB and added a notice that it is 15MB. 
- [x] Provide template CSV/Excel file.
  - Here: https://github.com/HexaCubist/Swish-UI/tree/master/samples-and-templates 
- [x] ~~Write code to convert CSV to JSON to be processble by [Swish logic](https://github.com/ron-t/Swish/tree/master/SampleCourseOfflineJSON) in [Create.js](https://github.com/ron-t/Swish/blob/master/SampleCourseOfflineJSON/Create.js) and [util.js](https://github.com/ron-t/Swish/blob/master/SampleCourseOfflineJSON/util.js)~~ (Not needed since SheetJS will convert CSV/Xls to JSON)

🤔 TODO: validation rules. E.g. an answer column exists for every question column; no empty cells (including empty string); ...

## Form fields validation
### Step one (field upload)
- [x] Replace the "If you're not sure how to make this file..." part with a link to the example input files: https://github.com/ron-t/Swish/tree/master/SwishUI/samples-and-templates
- [x] Include advice if an Excel file is uploaded: which sheet is used (always the first one?)

### Token
- [x] Must be provided.
- [ ] Link to page with guide on how to generate a token: https://github.com/ron-t/Swish/tree/master/Documents
  - Other documentation/guides should be place here too. 

### Domain
- [ ] Only allow 3 selectable options. Option 2 is default.
1. https://canvas.auckland.ac.nz
2. https://auckland.beta.instructure.com
3. https://auckland.test.instructure.com

### Course ID
- [ ] Must be numeric.
- ~~(?) Must be valid. Not sure if this is worth checking.~~ 
  - **Not worth checking (other errors will occur if the course id is wrong).**
  - ~~Logic would be something like an async GET call to the [Canvas API](https://canvas.auckland.ac.nz/doc/api/courses.html#method.courses.show) using the provided Token ; Endpoint: /api/v1/courses/:id ; Invalid if "unauthorised error" returned ; Valid if course data returned.~~

### Assignment title prefix
- [x] Must be provided.
- [ ] Impose **254** character limit.

### Number of questions
- [x] Must be integer.
- [ ] Should match the number of questions and answers provided in the uploaded file. Perhaps this could be automatically populated; if not, it would serve as a cross-check before submission.

### Total marks
- [x] Must be numeric.

### Lock date time
- [x] Must be datetime.
- [ ] Date format should be DD/MM/YYYY instead of MM/DD/YYYY.
- [ ] Check that timezones are correct. I.e. the lock date time provided in the form is exactly the same as what appears on Canvas; it will still work when daylight savings changes for NZTime.
- [ ] Explain that lock date will also be the due date.
- ~~[ ] Consider allowing a due date separate to lock date.~~

### Number of attempts
- [x] Must be numeric.
- [x] Leave blank for unlimited
- Note: the Canvas API uses -1 for unlimited attempts.


## Other issues
- [ ] Remove "Derive marks per Q" field. Force marks to be evenly distributed across questions.
- [ ] Change copyright ownership to Zac and Ron.
- [ ] Add note crediting SEED Fund 2019 for enabling SwishUI to be created.
- [ ] Consistent capitalisation or naming scheme for field names.
- [ ] Add privacy policy. Use the text below. This means we must **not keep any logs** of any sort. And definitely **no click analytics** or any of that sort of thing :)
  ```
  We do not knowingly collect any information about you or from Canvas.

  To create Canvas quizzes, SwishUI uses the information you provide on the site 
  to make use of the Canvas API (https://canvas.auckland.ac.nz/doc/api/). None of 
  the information you provide, or the information returned by the Canvas API is 
  stored by us. All Canvas API calls are made securely over HTTPS to 
  https://canvas.auckland.ac.nz or https://auckland.beta.instructure.com or 
  https://auckland.test.instructure.com.

  This policy was last updated on 7 November 2019.
  ```
- [ ] Add link to source code: https://github.com/ron-t/Swish
---
## [x] TODOs from 2019/08/01 meeting
~~Zac to:~~
1. ~~Investigate if SwishUI code can be entirely client-side.~~

~~Ron to:~~
1. ~~Change Swish logic to accept assignment description from JSON QA file.~~
   - ~~This will be done in the [Swish repo](https://github.com/ron-t/Swish/tree/master/SampleCourseOfflineJSON)~~
   - ~~[x] Changes to the JSON QA file format.~~
   - ~~[x] Changes to the quiz creation logic: where the description text is pulled from.~~
   - ~~(Private change) individualised URL generation logic.~~

2. ~~Add column to CSV for "description". This will mean:~~
     - ~~[x] CSV validation rules to match: total column count now 2 + (numQuestions * 2).~~

~~After this Zac can:~~

3. ~~Ensure CSV/xls to JSON conversion matches the [expected JSON QA format](https://github.com/ron-t/Swish/blob/master/SampleCourseOfflineJSON/inOutFiles/SampleFilesQA.json).~~

4. ~~"Module-ise" Swish logic.~~
