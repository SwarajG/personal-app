import { Button } from "@/components/ui/button"

function App() {
  const onClick = () => {
    console.log("Button clicked!");
  }

  return (
    <div className="text-center">
      <Button className="mt-4" onClick={onClick}>Tailwind Button</Button>
    </div>
  )
}

export default App
