interface PostMetadataFieldsProps {
  idPrefix: string
  category: string
  tags: string
  result: string
  onCategoryChange: (value: string) => void
  onTagsChange: (value: string) => void
  onResultChange: (value: string) => void
}

export default function PostMetadataFields({
  idPrefix, category, tags, result, onCategoryChange, onTagsChange, onResultChange,
}: PostMetadataFieldsProps) {
  return (
    <>
      <div className="admin-post-classification">
        <div>
          <label htmlFor={`${idPrefix}-category`} className="memory-feedback-label">Category</label>
          <select id={`${idPrefix}-category`} className="memory-feedback-input" value={category} onChange={e => onCategoryChange(e.target.value)}>
            <option value="technical">Technical Blog</option>
            <option value="hackathon">Hackathon Journey</option>
            <option value="research">Research Reading</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-tags`} className="memory-feedback-label">Tags</label>
          <input id={`${idPrefix}-tags`} type="text" className="memory-feedback-input" placeholder="Creative AI, game" value={tags} onChange={e => onTagsChange(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-result`} className="memory-feedback-label">Result</label>
        <input id={`${idPrefix}-result`} type="text" className="memory-feedback-input" value={result} onChange={e => onResultChange(e.target.value)} />
      </div>
    </>
  )
}
